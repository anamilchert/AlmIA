import Sidebar from '../Sidebar/Sidebar';
import './Layout.css';

export default function Layout({ ativo, children }) {
  return (
    <div className="layout">
      <Sidebar ativo={ativo} />
      <main className="layout-main">{children}</main>
    </div>
  );
}