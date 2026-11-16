import { useId, useState } from 'react';
import Sheet from './Sheet';
import { getPasscode, setPasscode } from '../storage/passcode';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  message?: string;
}

/** Asks for the app passcode once; it's then remembered on this device. */
export default function PasscodeSheet({ onClose, onSaved, message }: Props) {
  const id = useId();
  const [value, setValue] = useState(getPasscode());
  return (
    <Sheet title="Passcode" onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setPasscode(value.trim());
          onSaved();
        }}
      >
        <p className="muted">
          {message ?? 'Lookups are protected by the passcode you set in Netlify.'} You only need to enter it once on this
          device.
        </p>
        <div className="field">
          <label htmlFor={id}>Passcode</label>
          <input id={id} type="password" autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={!value.trim()}>
          Save and try again
        </button>
      </form>
    </Sheet>
  );
}
