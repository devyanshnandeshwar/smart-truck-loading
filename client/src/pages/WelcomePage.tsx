import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { authStorage } from '../utils/authStorage';

const WelcomePage = () => {
  const role = useMemo(() => authStorage.getRole(), []);

  return (
    <section className="card-shell">
      <div className="card-header">
        <p className="eyebrow">Authenticated</p>
        <h1>Tokens stored</h1>
        <p className="lede">
          We saved your latest access and refresh tokens locally. Role-aware routing will kick in next, but for now
          you can explore the flows again.
        </p>
      </div>

      <div className="welcome-panel">
        <p>
          Active role: <strong>{role ?? 'unknown'}</strong>
        </p>
        <div className="action-row">
          <Link to="/register" className="ghost">
            Register another user
          </Link>
          <Link to="/login" className="ghost">
            Back to login
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WelcomePage;
