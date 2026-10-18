import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { CatalogPage } from './CatalogPage';
import { Workspace } from './Workspace';
import './styles.css';

function App() {
  return <BrowserRouter><header className="app-header"><Link className="brand" to="/" aria-label="Failover home"><span className="brand-mark">f/</span> failover<span className="brand-caption">SYSTEM DESIGN PRACTICE</span></Link><span className="demo-badge"><span className="status-dot" /> Single-user local demo</span></header><Routes><Route path="/" element={<CatalogPage />} /><Route path="/challenges/:slug" element={<Workspace />} /><Route path="*" element={<main className="catalog-shell"><h1>Page not found</h1><Link to="/">Back to challenges</Link></main>} /></Routes></BrowserRouter>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
