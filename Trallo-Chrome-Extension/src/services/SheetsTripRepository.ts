import { newRowId, newTripId } from '../core/ids'
import { nowISO } from '../core/dates'
import {
  changedCells,
  fromRow,
  indexHeaders,
  rowNumberFor,
  toNumber,
  toRow,
  validateHeaders as validateHeaderRow,
  type CellValue,
  type HeaderIndex,
} from '../core/sheets/mappers'
import {
  ALL_TAB_SPECS,
  BUDGET_BLOCK,
  READ_WIDTH,
  TAB_SPECS,
  cellRange,
  tabRange,
  type TabSpec,
} from '../core/sheets/schema'
import { appError, type HeaderValidationResult } from '../core/types/errors'
import { emptyItemsByTab, type ItemForTab, type ItemsByTab, type NewItem, type TripItem } from '../core/types/items'
import { META_TAB, TAB_NAMES, type TabName } from '../core/types/tabs'
import type { NewTripInput, ShareRole, Trip, TripDetailsPatch } from '../core/types/trip'
import { DRIVE_API, SHEETS_API, type GoogleApiClient } from './GoogleApiClient'
import { TEMPLATE_TITLE, buildCreateBody, buildFormatRequests, buildTemplateValues } from './templateSpec'
import type { TripRef, TripRepository } from './TripRepository'

const MAX_ROWS = 1000
const APP_KEY = 'trallo'

type DriveFile = {
  id: string
  name: string
  modifiedTime?: string
  appProperties?: Record<string, string>
}

type ValueRange = { range?: string; values?: CellValue[][] }

type ParsedTab<T extends TabName> = {
  items: ItemForTab<T>[]
  headers: string[]
  index: HeaderIndex
  /** Rows that arrived with a blank ID and need one written back. */
  backfills: { rowNumber: number; rowId: string; column: number }[]
}

function sheetFileName(tripName: string): string {
  return `Trallo – ${tripName}`.slice(0, 120)
}

function metaRows(trip: Trip): string[][] {
  return [
    ['key', 'value'],
    ['tripId', trip.id],
    ['name', trip.name],
    ['cities', JSON.stringify(trip.cities)],
    ['startDate', trip.startDate],
    ['endDate', trip.endDate],
    ['travelers', JSON.stringify(trip.travelers)],
    ['currency', trip.currency],
    ['createdAt', trip.createdAt],
    ['schemaVersion', '1'],
  ]
}

function parseMeta(rows: CellValue[][] = []): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows.slice(1)) {
    const key = String(row?.[0] ?? '').trim()
    if (key) out[key] = String(row?.[1] ?? '')
  }
  return out
}

function parseList(raw: string | undefined): string[] {
  if (!raw) return []
  const text = raw.trim()
  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      /* fall through to comma splitting */
    }
  }
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * The only class that knows Google Sheets and Drive exist.
 *
 * Two rules shape everything here: rows are addressed by their ID column and
 * never by position, and column positions come from the header row of the live
 * sheet rather than from a hard-coded order. Together they mean a user can
 * sort, filter, insert rows, or add their own columns in Sheets without
 * breaking the extension.
 */
export class SheetsTripRepository implements TripRepository {
  private templateFileId?: string
  private readonly trips = new Map<string, Trip>()
  private readonly headerCache = new Map<string, string[]>()
  private readonly sheetIdCache = new Map<string, Map<string, number>>()
  private readonly api: GoogleApiClient

  constructor(api: GoogleApiClient) {
    this.api = api
  }

  // ------------------------------------------------------------ templates

  private async ensureTemplate(): Promise<string> {
    if (this.templateFileId) return this.templateFileId

    const found = await this.api.request<{ files: DriveFile[] }>(DRIVE_API, {
      query: {
        q: `appProperties has {key='${APP_KEY}' and value='template'} and trashed=false`,
        fields: 'files(id,name)',
        pageSize: 5,
      },
    })
    if (found.files?.length) {
      this.templateFileId = found.files[0].id
      return this.templateFileId
    }
    return this.createTemplate()
  }

  private async createTemplate(): Promise<string> {
    const created = await this.api.request<{ spreadsheetId: string }>(SHEETS_API, {
      method: 'POST',
      body: buildCreateBody(TEMPLATE_TITLE),
    })
    const id = created.spreadsheetId

    await this.api.request(`${SHEETS_API}/${id}/values:batchUpdate`, {
      method: 'POST',
      body: { valueInputOption: 'USER_ENTERED', data: buildTemplateValues() },
    })
    await this.api.request(`${SHEETS_API}/${id}:batchUpdate`, {
      method: 'POST',
      body: { requests: buildFormatRequests() },
    })
    await this.api.request(`${DRIVE_API}/${id}`, {
      method: 'PATCH',
      body: { appProperties: { [APP_KEY]: 'template' } },
      query: { fields: 'id' },
    })

    this.templateFileId = id
    return id
  }

  // ---------------------------------------------------------------- trips

  async createTripFromTemplate(input: NewTripInput): Promise<Trip> {
    const templateId = await this.ensureTemplate()
    const tripId = newTripId()
    const name = sheetFileName(input.name)

    const copy = await this.api.request<DriveFile>(`${DRIVE_API}/${templateId}/copy`, {
      method: 'POST',
      body: { name, appProperties: { [APP_KEY]: 'trip', tripId } },
      query: { fields: 'id,name,modifiedTime' },
    })

    const trip: Trip = {
      id: tripId,
      sheetFileId: copy.id,
      sheetName: copy.name ?? name,
      name: input.name,
      cities: input.cities,
      startDate: input.startDate,
      endDate: input.endDate,
      travelers: input.travelers,
      budget: input.budget,
      currency: input.currency,
      isActive: true,
      createdAt: nowISO(),
      lastSyncedAt: nowISO(),
      lastModifiedTime: copy.modifiedTime ?? '',
    }

    await this.writeTripMeta(trip)
    trip.lastModifiedTime = await this.readModifiedTime(trip.sheetFileId)
    this.trips.set(tripId, trip)
    return trip
  }

  private async writeTripMeta(trip: Trip): Promise<void> {
    await this.api.request(`${SHEETS_API}/${trip.sheetFileId}/values:batchUpdate`, {
      method: 'POST',
      body: {
        valueInputOption: 'RAW',
        data: [
          { range: tabRange(META_TAB, 'A1:B10'), values: metaRows(trip) },
          { range: tabRange(BUDGET_BLOCK.tab, BUDGET_BLOCK.budgetCell), values: [[trip.budget]] },
        ],
      },
    })
  }

  async listTripRefs(): Promise<TripRef[]> {
    const found = await this.api.request<{ files: DriveFile[] }>(DRIVE_API, {
      query: {
        q: `appProperties has {key='${APP_KEY}' and value='trip'} and trashed=false`,
        fields: 'files(id,name,modifiedTime,appProperties)',
        orderBy: 'createdTime desc',
        pageSize: 100,
      },
    })
    return (found.files ?? []).map((f) => ({
      tripId: f.appProperties?.tripId,
      sheetFileId: f.id,
      sheetName: f.name,
      modifiedTime: f.modifiedTime ?? '',
    }))
  }

  async loadTripFromRef(ref: TripRef): Promise<Trip> {
    const response = await this.api.request<{ valueRanges: ValueRange[] }>(
      `${SHEETS_API}/${ref.sheetFileId}/values:batchGet`,
      {
        query: {
          ranges: [tabRange(META_TAB, 'A1:B30'), tabRange(BUDGET_BLOCK.tab, BUDGET_BLOCK.budgetCell)],
          valueRenderOption: 'UNFORMATTED_VALUE',
        },
      },
    )
    const meta = parseMeta(response.valueRanges?.[0]?.values)
    const budget = toNumber(response.valueRanges?.[1]?.values?.[0]?.[0]) ?? 0

    const trip: Trip = {
      id: meta.tripId || ref.tripId || newTripId(),
      sheetFileId: ref.sheetFileId,
      sheetName: ref.sheetName,
      name: meta.name || ref.sheetName.replace(/^Trallo\s+[–-]\s+/, ''),
      cities: parseList(meta.cities),
      startDate: meta.startDate || '',
      endDate: meta.endDate || '',
      travelers: parseList(meta.travelers),
      budget,
      currency: meta.currency || 'USD',
      isActive: false,
      createdAt: meta.createdAt || '',
      lastSyncedAt: nowISO(),
      lastModifiedTime: ref.modifiedTime,
    }
    this.trips.set(trip.id, trip)
    return trip
  }

  async listTrips(): Promise<Trip[]> {
    const refs = await this.listTripRefs()
    return Promise.all(refs.map((ref) => this.loadTripFromRef(ref)))
  }

  async loadTrip(tripId: string): Promise<Trip> {
    const known = this.trips.get(tripId)
    if (known) {
      const ref: TripRef = {
        tripId,
        sheetFileId: known.sheetFileId,
        sheetName: known.sheetName,
        modifiedTime: await this.readModifiedTime(known.sheetFileId),
      }
      return this.loadTripFromRef(ref)
    }
    const refs = await this.listTripRefs()
    const ref = refs.find((r) => r.tripId === tripId)
    if (!ref) throw appError('NOT_FOUND', `No sheet found for trip ${tripId}`)
    return this.loadTripFromRef(ref)
  }

  async updateTripDetails(tripId: string, patch: TripDetailsPatch): Promise<Trip> {
    const current = await this.requireTrip(tripId)
    const next: Trip = { ...current, ...patch }

    await this.writeTripMeta(next)

    if (patch.name && patch.name !== current.name) {
      const renamed = await this.api.request<DriveFile>(`${DRIVE_API}/${next.sheetFileId}`, {
        method: 'PATCH',
        body: { name: sheetFileName(patch.name) },
        query: { fields: 'id,name' },
      })
      next.sheetName = renamed.name
    }

    next.lastModifiedTime = await this.readModifiedTime(next.sheetFileId)
    next.lastSyncedAt = nowISO()
    this.trips.set(tripId, next)
    return next
  }

  async deleteTrip(tripId: string): Promise<void> {
    const trip = await this.requireTrip(tripId)
    // Trash rather than delete: the sheet is the user's own document, and a
    // mis-tap on the delete icon should be recoverable from Drive.
    await this.api.request(`${DRIVE_API}/${trip.sheetFileId}`, {
      method: 'PATCH',
      body: { trashed: true },
      query: { fields: 'id' },
    })
    this.trips.delete(tripId)
    this.headerCache.clear()
    this.sheetIdCache.delete(trip.sheetFileId)
  }

  // ---------------------------------------------------------------- rows

  async readTab<T extends TabName>(tripId: string, tab: T): Promise<ItemForTab<T>[]> {
    const trip = await this.requireTrip(tripId)
    const spec = TAB_SPECS[tab]
    const response = await this.api.request<ValueRange>(
      `${SHEETS_API}/${trip.sheetFileId}/values/${encodeURIComponent(this.dataRange(tab))}`,
      { query: { valueRenderOption: 'UNFORMATTED_VALUE' } },
    )
    const parsed = this.parseTab<T>(spec, response.values ?? [], trip.sheetFileId)
    await this.backfillIds(trip.sheetFileId, tab, parsed.backfills)
    return parsed.items
  }

  async readAllTabs(tripId: string): Promise<ItemsByTab> {
    const trip = await this.requireTrip(tripId)
    const response = await this.api.request<{ valueRanges: ValueRange[] }>(
      `${SHEETS_API}/${trip.sheetFileId}/values:batchGet`,
      {
        query: {
          ranges: TAB_NAMES.map((t) => this.dataRange(t)),
          valueRenderOption: 'UNFORMATTED_VALUE',
        },
      },
    )

    const out = emptyItemsByTab()
    const backfills: { tab: TabName; rowNumber: number; rowId: string; column: number }[] = []

    TAB_NAMES.forEach((tab, i) => {
      const spec = TAB_SPECS[tab]
      const parsed = this.parseTab(spec, response.valueRanges?.[i]?.values ?? [], trip.sheetFileId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- parseTab is keyed by the same tab
      ;(out as any)[tab] = parsed.items
      backfills.push(...parsed.backfills.map((b) => ({ ...b, tab })))
    })

    await this.backfillIdsAcrossTabs(trip.sheetFileId, backfills)
    return out
  }

  private parseTab<T extends TabName>(
    spec: TabSpec,
    rows: CellValue[][],
    fileId: string,
  ): ParsedTab<T> {
    const headerRow = rows[0] ?? []
    const headers = headerRow.map((c) => String(c ?? ''))
    const index = indexHeaders(headerRow)
    this.headerCache.set(`${fileId}:${spec.name}`, headers)

    const idColumn = index[spec.idHeader]
    const items: ItemForTab<T>[] = []
    const backfills: ParsedTab<T>['backfills'] = []

    rows.slice(1).forEach((row, i) => {
      const item = fromRow(spec, row ?? [], index)
      if (!item) return
      if (!item.rowId) {
        // A row typed straight into Sheets. Give it an id so it can be edited
        // from the panel, and write that id back on this same read.
        item.rowId = newRowId(spec.name)
        if (idColumn !== undefined) {
          backfills.push({ rowNumber: rowNumberFor(i), rowId: item.rowId, column: idColumn })
        }
      }
      items.push(item as ItemForTab<T>)
    })

    return { items, headers, index, backfills }
  }

  private async backfillIds(
    fileId: string,
    tab: TabName,
    backfills: { rowNumber: number; rowId: string; column: number }[],
  ): Promise<void> {
    await this.backfillIdsAcrossTabs(
      fileId,
      backfills.map((b) => ({ ...b, tab })),
    )
  }

  private async backfillIdsAcrossTabs(
    fileId: string,
    backfills: { tab: TabName; rowNumber: number; rowId: string; column: number }[],
  ): Promise<void> {
    if (backfills.length === 0) return
    await this.api.request(`${SHEETS_API}/${fileId}/values:batchUpdate`, {
      method: 'POST',
      body: {
        valueInputOption: 'RAW',
        data: backfills.map((b) => ({
          range: cellRange(b.tab, b.column, b.rowNumber),
          values: [[b.rowId]],
        })),
      },
    })
  }

  async appendRow(tripId: string, tab: TabName, item: NewItem): Promise<TripItem> {
    const trip = await this.requireTrip(tripId)
    const spec = TAB_SPECS[tab]
    const headers = await this.getHeaders(trip.sheetFileId, tab)
    const index = indexHeaders(headers)

    const missing = validateHeaderRow(spec, headers)
    if (!missing.ok) {
      throw appError(
        'SHEET_STRUCTURE_BROKEN',
        `${tab} is missing: ${missing.missingColumns.join(', ')}`,
      )
    }

    const rowId = newRowId(tab)
    const saved = { ...item, rowId } as TripItem
    const row = toRow(spec, saved as unknown as Record<string, unknown>, index, headers.length)

    await this.api.request(
      `${SHEETS_API}/${trip.sheetFileId}/values/${encodeURIComponent(tabRange(tab, 'A1'))}:append`,
      {
        method: 'POST',
        query: {
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          responseValueRenderOption: 'UNFORMATTED_VALUE',
        },
        body: { values: [row] },
      },
    )
    return saved
  }

  async updateRowById(
    tripId: string,
    tab: TabName,
    rowId: string,
    patch: Partial<TripItem>,
  ): Promise<TripItem> {
    const trip = await this.requireTrip(tripId)
    const spec = TAB_SPECS[tab]
    const { rows, index } = await this.readRaw(trip.sheetFileId, tab)

    const located = this.locateRow(spec, rows, index, rowId)
    const before = fromRow(spec, rows[located.dataIndex + 1] ?? [], index)
    if (!before) throw appError('NOT_FOUND', `Row ${rowId} is empty`)

    const after = { ...before, ...patch, rowId, tab } as TripItem
    const writes = changedCells(
      spec,
      before as unknown as Record<string, unknown>,
      after as unknown as Record<string, unknown>,
      index,
      located.rowNumber,
    )
    if (writes.length > 0) {
      await this.api.request(`${SHEETS_API}/${trip.sheetFileId}/values:batchUpdate`, {
        method: 'POST',
        body: {
          valueInputOption: 'RAW',
          data: writes.map((w) => ({ range: tabRange(tab, w.a1), values: [[w.value]] })),
        },
      })
    }
    return after
  }

  async deleteRowById(tripId: string, tab: TabName, rowId: string): Promise<void> {
    const trip = await this.requireTrip(tripId)
    const spec = TAB_SPECS[tab]
    const { rows, index } = await this.readRaw(trip.sheetFileId, tab)
    const located = this.locateRow(spec, rows, index, rowId)
    const sheetId = await this.getSheetId(trip.sheetFileId, tab)

    await this.api.request(`${SHEETS_API}/${trip.sheetFileId}:batchUpdate`, {
      method: 'POST',
      body: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: located.rowNumber - 1,
                endIndex: located.rowNumber,
              },
            },
          },
        ],
      },
    })
  }

  private locateRow(
    spec: TabSpec,
    rows: CellValue[][],
    index: HeaderIndex,
    rowId: string,
  ): { dataIndex: number; rowNumber: number } {
    const idColumn = index[spec.idHeader]
    if (idColumn === undefined) {
      throw appError('SHEET_STRUCTURE_BROKEN', `${spec.name} has no ${spec.idHeader} column`)
    }
    const dataIndex = rows.slice(1).findIndex((row) => String(row?.[idColumn] ?? '').trim() === rowId)
    if (dataIndex < 0) {
      throw appError('NOT_FOUND', `Row ${rowId} is no longer in ${spec.name}`)
    }
    return { dataIndex, rowNumber: rowNumberFor(dataIndex) }
  }

  private async readRaw(
    fileId: string,
    tab: TabName,
  ): Promise<{ rows: CellValue[][]; index: HeaderIndex }> {
    const response = await this.api.request<ValueRange>(
      `${SHEETS_API}/${fileId}/values/${encodeURIComponent(this.dataRange(tab))}`,
      { query: { valueRenderOption: 'UNFORMATTED_VALUE' } },
    )
    const rows = response.values ?? []
    const headerRow = rows[0] ?? []
    this.headerCache.set(
      `${fileId}:${tab}`,
      headerRow.map((c) => String(c ?? '')),
    )
    return { rows, index: indexHeaders(headerRow) }
  }

  private dataRange(tab: TabName): string {
    return tabRange(tab, `A1:${READ_WIDTH}${MAX_ROWS}`)
  }

  private async getHeaders(fileId: string, tab: TabName): Promise<string[]> {
    const cached = this.headerCache.get(`${fileId}:${tab}`)
    if (cached) return cached
    const response = await this.api.request<ValueRange>(
      `${SHEETS_API}/${fileId}/values/${encodeURIComponent(tabRange(tab, `A1:${READ_WIDTH}1`))}`,
    )
    const headers = (response.values?.[0] ?? []).map((c) => String(c ?? ''))
    this.headerCache.set(`${fileId}:${tab}`, headers)
    return headers
  }

  // ------------------------------------------------------------ meta ops

  async getModifiedTime(tripId: string): Promise<string> {
    const trip = await this.requireTrip(tripId)
    return this.readModifiedTime(trip.sheetFileId)
  }

  private async readModifiedTime(fileId: string): Promise<string> {
    const file = await this.api.request<DriveFile>(`${DRIVE_API}/${fileId}`, {
      query: { fields: 'modifiedTime' },
    })
    return file.modifiedTime ?? ''
  }

  async validateHeaders(tripId: string): Promise<HeaderValidationResult[]> {
    const trip = await this.requireTrip(tripId)
    const response = await this.api.request<{ valueRanges: ValueRange[] }>(
      `${SHEETS_API}/${trip.sheetFileId}/values:batchGet`,
      { query: { ranges: TAB_NAMES.map((t) => tabRange(t, `A1:${READ_WIDTH}1`)) } },
    )
    return ALL_TAB_SPECS.map((spec, i) =>
      validateHeaderRow(spec, response.valueRanges?.[i]?.values?.[0] ?? []),
    )
  }

  async share(tripId: string, email: string, role: ShareRole): Promise<void> {
    const trip = await this.requireTrip(tripId)
    await this.api.request(`${DRIVE_API}/${trip.sheetFileId}/permissions`, {
      method: 'POST',
      query: { sendNotificationEmail: true, fields: 'id' },
      body: { role, type: 'user', emailAddress: email },
    })
  }

  async getSheetUrl(tripId: string, tab?: TabName): Promise<string> {
    const trip = await this.requireTrip(tripId)
    const base = `https://docs.google.com/spreadsheets/d/${trip.sheetFileId}/edit`
    if (!tab) return base
    try {
      return `${base}#gid=${await this.getSheetId(trip.sheetFileId, tab)}`
    } catch {
      return base
    }
  }

  private async getSheetId(fileId: string, tab: TabName): Promise<number> {
    let perFile = this.sheetIdCache.get(fileId)
    if (!perFile) {
      const meta = await this.api.request<{
        sheets: { properties: { sheetId: number; title: string } }[]
      }>(`${SHEETS_API}/${fileId}`, { query: { fields: 'sheets.properties(sheetId,title)' } })
      perFile = new Map(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]))
      this.sheetIdCache.set(fileId, perFile)
    }
    const sheetId = perFile.get(tab)
    if (sheetId === undefined) {
      throw appError('SHEET_STRUCTURE_BROKEN', `Tab "${tab}" is missing from the sheet`)
    }
    return sheetId
  }

  private async requireTrip(tripId: string): Promise<Trip> {
    const known = this.trips.get(tripId)
    if (known) return known
    const refs = await this.listTripRefs()
    const ref = refs.find((r) => r.tripId === tripId)
    if (!ref) throw appError('NOT_FOUND', `No sheet found for trip ${tripId}`)
    return this.loadTripFromRef(ref)
  }

  /** Lets TripManager seed the file-id index from its own cache on a cold start. */
  prime(trips: Trip[]): void {
    for (const trip of trips) this.trips.set(trip.id, trip)
  }
}
