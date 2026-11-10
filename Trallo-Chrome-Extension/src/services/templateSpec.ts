import { ALL_TAB_SPECS, BUDGET_BLOCK, type TabSpec } from '../core/sheets/schema'
import { META_TAB } from '../core/types/tabs'

/**
 * Builds the master template spreadsheet.
 *
 * Trallo creates its own template in the user's Drive on first run rather than
 * copying a shared master. The drive.file scope only reaches files this
 * extension created, so a template it did not create could not be copied — and
 * widening the scope to all of Drive for one copy operation is not a trade
 * worth making.
 */

const DEEP_GREEN = { red: 0.173, green: 0.29, blue: 0.2 }
const WHITE = { red: 1, green: 1, blue: 1 }
const WIDE_HEADERS = new Set(['Notes', 'Note', 'Address', 'URL', 'Airline & Flight #'])
const DATA_ROWS = 500

export const TEMPLATE_TITLE = 'Trallo Trip Template'
export const META_SHEET_ID = 99

/** Stable sheetIds so later batchUpdates don't need a lookup on a fresh template. */
export function sheetIdFor(index: number): number {
  return index + 1
}

export function buildCreateBody(title: string) {
  const sheets = ALL_TAB_SPECS.map((spec, i) => ({
    properties: {
      sheetId: sheetIdFor(i),
      title: spec.name,
      gridProperties: {
        rowCount: DATA_ROWS,
        columnCount: Math.max(spec.fields.length + 2, 12),
        frozenRowCount: 1,
      },
    },
  }))
  sheets.push({
    properties: {
      sheetId: META_SHEET_ID,
      title: META_TAB,
      // Hidden: it is Trallo's bookkeeping, not something to edit by hand.
      hidden: true,
      gridProperties: { rowCount: 50, columnCount: 2, frozenRowCount: 1 },
    },
  } as never)
  return { properties: { title }, sheets }
}

/** Header text, the budget block formulas, and the meta tab's own header. */
export function buildTemplateValues() {
  const data: { range: string; values: (string | number)[][] }[] = ALL_TAB_SPECS.map((spec) => ({
    range: `'${spec.name}'!A1`,
    values: [spec.fields.map((f) => f.header)],
  }))
  data.push({
    range: `'${BUDGET_BLOCK.tab}'!${BUDGET_BLOCK.range}`,
    values: [
      [
        'Budget',
        0,
        'Expenses',
        BUDGET_BLOCK.expensesFormula,
        'Amount Left',
        BUDGET_BLOCK.remainingFormula,
      ],
    ],
  })
  data.push({ range: `'${META_TAB}'!A1`, values: [['key', 'value']] })
  return data
}

function validationRequests(spec: TabSpec, sheetId: number) {
  const requests: unknown[] = []
  for (const validation of spec.validations ?? []) {
    const column = spec.fields.findIndex((f) => f.header === validation.header)
    if (column < 0) continue
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: DATA_ROWS, startColumnIndex: column, endColumnIndex: column + 1 },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: validation.values.map((v) => ({ userEnteredValue: v })),
          },
          showCustomUi: true,
          // Not strict: a hand-typed value should warn, not be rejected outright.
          strict: false,
        },
      },
    })
  }
  for (const header of spec.checkboxes ?? []) {
    const column = spec.fields.findIndex((f) => f.header === header)
    if (column < 0) continue
    requests.push({
      setDataValidation: {
        range: { sheetId, startRowIndex: 1, endRowIndex: DATA_ROWS, startColumnIndex: column, endColumnIndex: column + 1 },
        rule: { condition: { type: 'BOOLEAN' }, showCustomUi: true },
      },
    })
  }
  return requests
}

export function buildFormatRequests(): unknown[] {
  const requests: unknown[] = []

  ALL_TAB_SPECS.forEach((spec, i) => {
    const sheetId = sheetIdFor(i)

    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: DEEP_GREEN,
            textFormat: { bold: true, foregroundColor: WHITE },
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)',
      },
    })

    spec.fields.forEach((field, column) => {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: column, endIndex: column + 1 },
          properties: { pixelSize: WIDE_HEADERS.has(field.header) ? 280 : 160 },
          fields: 'pixelSize',
        },
      })
    })

    const idColumn = spec.fields.findIndex((f) => f.header === spec.idHeader)
    if (idColumn >= 0) {
      // Hidden because row ids are plumbing. Rows added by hand get one
      // backfilled on the next read, so hiding it costs the user nothing.
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: idColumn, endIndex: idColumn + 1 },
          properties: { hiddenByUser: true },
          fields: 'hiddenByUser',
        },
      })
    }

    // warningOnly so a collaborator can still repair a header they broke,
    // but nobody wipes the row by accident.
    requests.push({
      addProtectedRange: {
        protectedRange: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          description: 'Trallo reads these column names. Renaming one breaks the extension.',
          warningOnly: true,
        },
      },
    })

    requests.push(...validationRequests(spec, sheetId))
  })

  // Make the budget block read like a summary rather than data.
  requests.push({
    repeatCell: {
      range: {
        sheetId: sheetIdFor(ALL_TAB_SPECS.findIndex((s) => s.name === BUDGET_BLOCK.tab)),
        startRowIndex: 0,
        endRowIndex: 1,
        startColumnIndex: 6,
        endColumnIndex: 12,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.95, green: 0.97, blue: 0.94 },
          textFormat: { bold: true, foregroundColor: DEEP_GREEN },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)',
    },
  })

  return requests
}
