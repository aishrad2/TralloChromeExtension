import type { ReactNode } from 'react'
import type { TabName } from '../../core/types/tabs'
import { useTrip } from '../../state/useTrip'
import { LinkButton } from '../components/Buttons'
import { ErrorBanner, StructureBanner } from '../components/Feedback'
import { BackLink, Panel, ScreenHead, Section, SyncFooter, TopBar } from '../components/Layout'

/** Chrome shared by all six module screens: back link, title, banners, footer. */
export function ModuleShell({
  tab,
  title,
  right,
  children,
  below,
}: {
  tab: TabName
  title: string
  right?: ReactNode
  children: ReactNode
  below?: ReactNode
}) {
  const { state, actions } = useTrip()

  return (
    <Panel
      top={<TopBar left={<BackLink label="Back to Hub" onClick={actions.goHub} />} />}
      footer={<SyncFooter tab={tab} />}
    >
      <ScreenHead title={title} right={right} />

      <Section>
        {state.error ? (
          <ErrorBanner
            error={state.error}
            onDismiss={actions.dismissError}
            onRetry={() => void actions.refresh()}
            onSignIn={() => void actions.signIn()}
          />
        ) : null}
        <StructureBanner
          problems={state.structureProblems}
          onRetry={() => void actions.refresh()}
        />
        {children}
      </Section>
      {below}
    </Panel>
  )
}

/** "Use Current URL" affordance shared by the three screens with a link field. */
export function UseCurrentUrl({ onPick }: { onPick: () => void }) {
  return <LinkButton onClick={onPick}>Use Current URL</LinkButton>
}
