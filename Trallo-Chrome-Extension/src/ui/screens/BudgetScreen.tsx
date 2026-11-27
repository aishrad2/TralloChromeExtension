import { formatDay } from '../../core/dates'
import { money } from '../../core/format'
import { useTrip } from '../../state/useTrip'
import { EmptyState } from '../components/Cards'
import { SavedList, SavedRow } from '../components/SavedList'
import { ModuleShell } from './ModuleShell'

/**
 * Read-only by design: the Budgeting & Expenses tab is where the sheet does the
 * arithmetic, so this screen reports and hands off to Sheets rather than
 * duplicating the editing surface.
 */
export function BudgetScreen() {
  const { items, activeTrip, summary } = useTrip()
  const currency = activeTrip?.currency
  const expenses = items['Budgeting & Expenses']
  const remaining = summary?.budgetRemaining ?? 0

  return (
    <ModuleShell
      title="Budget & Expenses"
      below={
        <SavedList
          label="Logged expenses"
          count={expenses.length}
          empty="No expenses logged yet. Add rows on the Budgeting & Expenses tab and they show up here."
        >
          {expenses.map((expense) => (
            <SavedRow
              key={expense.rowId}
              title={expense.expenseType ?? 'Expense'}
              badges={[expense.cost !== undefined ? money(expense.cost, currency) : ''].filter(Boolean)}
              lines={[
                expense.date ? formatDay(expense.date) : undefined,
                expense.paidBy ? `Paid by ${expense.paidBy}` : undefined,
              ]}
            />
          ))}
        </SavedList>
      }
    >
      {activeTrip ? (
        <div className="summarygrid">
          <div className="summaryrow">
            <span className="summaryrow__label">Budget</span>
            <span className="summaryrow__value">{money(activeTrip.budget, currency)}</span>
          </div>
          <div className="summaryrow">
            <span className="summaryrow__label">Expenses</span>
            <span className="summaryrow__value">{money(summary?.totalExpenses ?? 0, currency)}</span>
          </div>
          <div className="summaryrow">
            <span className="summaryrow__label">Amount Left</span>
            <span
              className={
                remaining < 0 ? 'summaryrow__value summaryrow__value--negative' : 'summaryrow__value'
              }
            >
              {money(remaining, currency)}
            </span>
          </div>
        </div>
      ) : (
        <EmptyState>Open a trip to see its budget.</EmptyState>
      )}

      <p className="field__hint">
        Budget and expenses live in the sheet. Edit the Budget cell or add expense rows there and
        Trallo picks the change up on the next sync.
      </p>

    </ModuleShell>
  )
}
