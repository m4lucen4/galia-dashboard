import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Navbar from "@/components/shared/ui/Navbar";
import { Drawer } from "@/components/shared/ui/Drawer";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchWikiNavigation, fetchWikiSection, searchWiki } from "@/redux/actions/WikiActions";
import { clearWikiSearch } from "@/redux/slices/WikiSlice";
import { WikiContent } from "../components/WikiContent";
import type { WikiArticle, WikiSectionNavigation } from "../types/wiki";

const scrollToAnchor = (id: string) => {
  document.getElementById(id)?.scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
};

export const Documentation = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { sectionId } = useParams();
  const { navigation, section, results, navigationRequest, sectionRequest, searchRequest } = useAppSelector(
    (state) => state.wiki,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeArticle, setActiveArticle] = useState("");
  const [term, setTerm] = useState("");
  const sidebarRef = useRef<HTMLElement>(null);
  const selectedSection = sectionId ?? navigation[0]?.id;

  useEffect(() => {
    void dispatch(fetchWikiNavigation());
  }, [dispatch]);

  useEffect(() => {
    if (selectedSection) void dispatch(fetchWikiSection(selectedSection));
  }, [dispatch, selectedSection]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = term.trim();
      if (next) void dispatch(searchWiki(next));
      else dispatch(clearWikiSearch());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [dispatch, term]);

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (!hash || !section || section.id !== selectedSection) return;

    const timer = window.setTimeout(() => scrollToAnchor(hash), 180);
    return () => window.clearTimeout(timer);
  }, [location.hash, section, selectedSection]);

  useEffect(() => {
    if (!section) return;

    const articles = Array.from(document.querySelectorAll<HTMLElement>("[data-wiki-article]"));
    const updateActiveArticle = () => {
      const eligible = articles.filter((article) => article.getBoundingClientRect().top <= 150);
      const topmost = eligible[eligible.length - 1] ?? articles[0];

      if (topmost) setActiveArticle(topmost.id);
    };
    const observer = new IntersectionObserver(updateActiveArticle, {
      rootMargin: "-96px 0px -65% 0px",
      threshold: 0,
    });

    articles.forEach((article) => observer.observe(article));
    updateActiveArticle();

    return () => observer.disconnect();
  }, [section]);

  useEffect(() => {
    const item = sidebarRef.current?.querySelector<HTMLElement>(`[data-article-link="${activeArticle}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [activeArticle]);

  const goToSection = (item: WikiSectionNavigation) => {
    setDrawerOpen(false);
    navigate(`/wiki/${item.id}/${item.slug}`);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const goToArticle = (article: WikiArticle) => {
    setDrawerOpen(false);
    navigate(article.canonicalLink);
  };

  const sidebar = (
    <nav aria-label="Documentación" className="space-y-2">
      {navigation.map((item) => (
        <div key={item.id}>
          <button
            type="button"
            onClick={() => goToSection(item)}
            aria-current={item.id === selectedSection ? "page" : undefined}
            className={`w-full rounded-lg px-3 py-2 text-left font-semibold ${item.id === selectedSection ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-100"}`}
          >
            {item.title}
          </button>
          {item.id === selectedSection && item.subsections.map((subsection) => (
            <div key={subsection.id} className="ml-3 mt-2">
              <p className="px-3 text-xs font-bold uppercase tracking-wide text-gray-500">{subsection.title}</p>
              {subsection.articles.map((article) => (
                <button
                  type="button"
                  key={article.id}
                  data-article-link={`article-${article.id}`}
                  onClick={() => goToArticle(article as WikiArticle)}
                  aria-current={activeArticle === `article-${article.id}` ? "location" : undefined}
                  className={`mt-1 w-full rounded px-3 py-2 text-left text-sm ${activeArticle === `article-${article.id}` ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  {article.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <Navbar />
      <a href="#wiki-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-3">
        Saltar al contenido
      </a>
      <main className="min-h-screen bg-white">
        <header className="border-b border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-500">Mocklab</p>
            <h1 className="mt-2 text-4xl font-bold text-gray-900">Documentación</h1>
            <p className="mt-3 max-w-2xl text-gray-600">Guías para sacar el máximo partido a tu estudio.</p>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12">
          <aside ref={sidebarRef} className="sticky top-4 hidden max-h-[calc(100vh-2rem)] overflow-y-auto pr-3 lg:block">
            {navigationRequest.inProgress ? <p className="text-sm text-gray-500">Cargando índice…</p> : sidebar}
          </aside>
          <button type="button" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} className="mb-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium lg:hidden">
            <Bars3Icon className="size-5" /> Abrir índice
          </button>
          <Drawer title="Documentación" isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>{sidebar}</Drawer>
          <section id="wiki-content" className="min-w-0">
            <div className="relative mb-8">
              <label htmlFor="wiki-search" className="sr-only">Buscar en la documentación</label>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 size-5 text-gray-400" />
              <input id="wiki-search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Buscar en la documentación" className="w-full rounded-xl border border-gray-300 py-3 pr-10 pl-10 shadow-sm focus:border-gray-900 focus:ring-gray-900" />
              {term && <button type="button" onClick={() => setTerm("")} className="absolute right-3 top-3" aria-label="Limpiar búsqueda"><XMarkIcon className="size-5" /></button>}
              {term && <div className="absolute z-20 mt-2 w-full rounded-xl border bg-white p-2 shadow-lg">
                {searchRequest.inProgress && <p className="p-3 text-sm text-gray-500">Buscando…</p>}
                {!searchRequest.inProgress && searchRequest.messages && <p className="p-3 text-sm text-red-700">{searchRequest.messages}</p>}
                {!searchRequest.inProgress && !searchRequest.messages && results.length === 0 && <p className="p-3 text-sm text-gray-500">No hay resultados publicados.</p>}
                {results.map((result) => <button type="button" key={result.article_id} onClick={() => { setTerm(""); navigate(`/wiki/${result.section_id}/${result.section_slug}#article-${result.article_id}`); }} className="block w-full rounded-lg p-3 text-left hover:bg-gray-50"><strong className="block text-gray-900">{result.title}</strong><span className="line-clamp-2 text-sm text-gray-600">{result.summary}</span></button>)}
              </div>}
            </div>
            {sectionRequest.inProgress && <p className="py-16 text-center text-gray-500">Cargando documentación…</p>}
            {!sectionRequest.inProgress && sectionRequest.messages && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"><p>{sectionRequest.messages}</p><button type="button" onClick={() => selectedSection && dispatch(fetchWikiSection(selectedSection))} className="mt-3 underline">Reintentar</button></div>}
            {!sectionRequest.inProgress && !sectionRequest.messages && !section && <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center"><h2 className="text-xl font-bold">Esta sección no está disponible</h2><Link to="/wiki" className="mt-3 inline-block underline">Volver a la documentación</Link></div>}
            {!navigationRequest.inProgress && navigation.length === 0 && !navigationRequest.messages && <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center"><h2 className="text-xl font-bold">Todavía no hay documentación publicada</h2><p className="mt-2 text-gray-600">Vuelve pronto para consultar las próximas guías.</p></div>}
            {section && (
              <div>
                {section.subsections.map((subsection) => (
                  <section key={subsection.id} id={`subsection-${subsection.id}`} className="mb-14 scroll-mt-24">
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">{subsection.title}</h2>
                    {subsection.articles.map((article) => (
                      <article key={article.id} id={`article-${article.id}`} data-wiki-article className="mb-12 scroll-mt-24 border-b border-gray-200 pb-10">
                        <h3 className="text-3xl font-bold text-gray-900">{article.title}</h3>
                        {article.summary && <p className="mt-3 text-lg text-gray-600">{article.summary}</p>}
                        <div className="mt-6"><WikiContent nodes={article.content.content} /></div>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
};
