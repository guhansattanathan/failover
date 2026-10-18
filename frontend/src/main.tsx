import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { CatalogPage } from './CatalogPage';
import { Workspace } from './Workspace';
import './styles.css';

function Header() {
  const isHome = useLocation().pathname === '/';
  return <header className={`app-header ${isHome ? 'landing-header' : ''}`}><Link className="brand" to="/" aria-label="Failover home"><svg className="brand-logo" viewBox="280 250 1425 300" role="img" aria-label="Failover"><image href="/brand/failover-approved.png" width="1979" height="794"/></svg></Link>{isHome && <nav aria-label="Main navigation"><a href="#challenges">Challenges</a><a href="#how-it-works">How it works</a><a className="nav-start" href="#challenges">Start designing <span aria-hidden="true">↗</span></a></nav>}</header>;
}

function App() {
  return <BrowserRouter><Header/><Routes><Route path="/" element={<CatalogPage />} /><Route path="/challenges/:slug" element={<Workspace />} /><Route path="*" element={<main className="catalog-shell"><h1>Page not found</h1><Link to="/">Back to challenges</Link></main>} /></Routes></BrowserRouter>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
