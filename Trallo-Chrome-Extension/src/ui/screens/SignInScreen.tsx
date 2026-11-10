import { PrimaryButton } from '../components/Buttons'
import { Banner } from '../components/Feedback'
import { Panel, TopBar } from '../components/Layout'
import { GoogleMark } from '../components/icons'
import { useTrip } from '../../state/useTrip'

export function SignInScreen() {
  const { state, actions } = useTrip()
  const signingIn = state.authState === 'signing-in'

  return (
    <Panel top={<TopBar left={<img className="topbar__logo" src="images/trallo-logo.png" alt="Trallo" />} />}>
      <div className="signin">
        <img className="signin__logo" src="images/plane-logo.png" alt="" />
        <h1 className="signin__title">Plan a trip in one sheet</h1>
        <p className="signin__text">
          Trallo keeps flights, housing, bucket list, packing and budget in a single Google Sheet in
          your own Drive. Nothing is stored anywhere else.
        </p>

        {state.error ? (
          <Banner>
            {state.error.friendlyMessage}
            {state.error.code === 'AUTH_CONFIG' ? (
              <span style={{ display: 'block', marginTop: 6 }}>
                See SETUP.md for the OAuth client steps.
              </span>
            ) : null}
          </Banner>
        ) : null}

        <PrimaryButton
          icon={<GoogleMark size={16} />}
          onClick={() => void actions.signIn()}
          disabled={signingIn}
        >
          {signingIn ? 'Opening Google…' : 'Sign in with Google'}
        </PrimaryButton>

        <p className="field__hint" style={{ maxWidth: '32ch' }}>
          Trallo asks only for access to the files it creates — never the rest of your Drive.
        </p>
      </div>
    </Panel>
  )
}
