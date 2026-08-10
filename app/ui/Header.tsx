'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { nav } from '../data';

type Item = { label: string; href: string; enabled?: boolean };
type Config = { header?: { topbarText?: string; topbarPhone?: string; greeting?: string; customerLabel?: string; customerHref?: string; menu?: Item[]; servicesLabel?: string; services?: Item[]; ctaLabel?: string; ctaHref?: string } };
const fallbackMenu: Item[] = [{ label: 'Início', href: '/' }, ...nav.map(([label, href]) => ({ label, href }))];
const fallbackServices: Item[] = [{ label: 'Fale Conosco', href: '/contato/' }, { label: 'Passo a Passo APP', href: '/passo-a-passo-app/' }, { label: 'ANS', href: '/ans/' }, { label: 'Blog', href: '/blog/' }];

export default function Header() {
  const [open, setOpen] = useState(false); const [servicesOpen, setServicesOpen] = useState(false); const [config, setConfig] = useState<Config>({});
  useEffect(() => { fetch('/api/site-config', { cache: 'no-store' }).then(response => response.json()).then(setConfig).catch(() => undefined); }, []);
  const header = config.header || {}; const menu = header.menu?.length ? header.menu : fallbackMenu; const services = header.services?.length ? header.services : fallbackServices;
  const closeMenus = () => { setOpen(false); setServicesOpen(false); };
  return <header className="site-header"><div className="topbar"><span>{header.topbarText || 'Atendimento:'} <b>{header.topbarPhone || '85 3133.9162'}</b></span><div><span className="user-greeting">{header.greeting || 'Olá, visitante'}</span><a href={header.customerHref || 'https://corporativo.odontoartonline.com.br'}>{header.customerLabel || 'Área do cliente'}</a></div></div><div className="nav-wrap"><Link className="logo" href="/" onClick={closeMenus}><span>odonto</span><i>art</i></Link><button className="menu-button" onClick={() => setOpen(!open)} aria-label="Abrir menu">☰</button><nav className={open ? 'open' : ''}>{menu.filter(item => item.enabled !== false).map(item => <Link key={`${item.label}-${item.href}`} href={item.href} onClick={closeMenus}>{item.label}</Link>)}<div className="services-menu" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}><button className="services-trigger" aria-expanded={servicesOpen} onClick={() => setServicesOpen(!servicesOpen)}>{header.servicesLabel || 'Mais Serviços'} <span>⌄</span></button><div className={servicesOpen ? 'services-dropdown open' : 'services-dropdown'}>{services.filter(item => item.enabled !== false).map(item => <Link key={`${item.label}-${item.href}`} href={item.href} onClick={closeMenus}>{item.label}</Link>)}</div></div><Link className="nav-cta" href={header.ctaHref || '/ecommerce-fc/'} onClick={closeMenus}>{header.ctaLabel || 'Faça seu Plano'}</Link></nav></div></header>;
}
