import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchWikiNavigation, fetchWikiSection, searchWiki } from "@/redux/actions/WikiActions";
import { clearWikiSearch } from "@/redux/slices/WikiSlice";
import { WikiContent } from "@/features/documentation/components/WikiContent";
import { DocumentationLayout, DocumentationLoadingContent } from "../components/DocumentationLayout";
import { Container } from "@/features/newWeb/components/ui/Container";
import { Button } from "@/features/newWeb/components/ui/Button";
import { FormField } from "@/features/newWeb/components/ui/FormField";
import "@/features/newWeb/articles.css";

export const Documentation = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { sectionId } = useParams();
  const { navigation, section, sectionId: requestedSectionId, results, query, navigationRequest, sectionRequest, searchRequest } = useAppSelector((state) => state.wiki);
  const [term, setTerm] = useState("");
  const [activeArticle, setActiveArticle] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileIndexRef = useRef<HTMLDetailsElement>(null);
  const selectedSection = sectionId ?? navigation[0]?.id;
  const visibleSection = section?.id === selectedSection ? section : null;
  const navigationLoading = navigationRequest.inProgress || (!navigationRequest.ok && !navigationRequest.messages);
  const sectionLoading = Boolean(selectedSection) && (
    requestedSectionId !== selectedSection || sectionRequest.inProgress || (!sectionRequest.ok && !sectionRequest.messages)
  );
  const contentLoading = navigationLoading || sectionLoading;
  const searchTerm = term.trim();
  const searchPending = searchRequest.inProgress || query !== searchTerm;

  useEffect(() => {
    void dispatch(fetchWikiNavigation());
  }, [dispatch]);

  useEffect(() => {
    if (selectedSection) void dispatch(fetchWikiSection(selectedSection));
  }, [dispatch, selectedSection]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchTerm) void dispatch(searchWiki(searchTerm));
      else dispatch(clearWikiSearch());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [dispatch, searchTerm]);

  useEffect(() => {
    if (contentLoading || !location.hash || !visibleSection) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [contentLoading, location.hash, visibleSection]);

  useEffect(() => {
    const articles = Array.from(contentRef.current?.querySelectorAll<HTMLElement>("[data-wiki-article]") ?? []);
    if (articles.length === 0) return;
    const updateActiveArticle = () => {
      const passed = articles.filter((article) => article.getBoundingClientRect().top <= 150);
      setActiveArticle((passed[passed.length - 1] ?? articles[0]).id);
    };
    const observer = new IntersectionObserver(updateActiveArticle, { rootMargin: "-112px 0px -65% 0px", threshold: 0 });
    articles.forEach((article) => observer.observe(article));
    updateActiveArticle();
    return () => observer.disconnect();
  }, [contentLoading, visibleSection]);

  useEffect(() => {
    sidebarRef.current?.querySelector<HTMLElement>(`[data-article-link="${activeArticle}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeArticle]);

  const closeIndex = () => {
    if (mobileIndexRef.current) mobileIndexRef.current.open = false;
  };

  const sidebar = (
    <nav aria-label="Índice de documentación" className="space-y-6">
      {navigation.map((item) => (
        <div key={item.id}>
          <Link
            to={`/wiki/${item.id}/${item.slug}`}
            onClick={() => { closeIndex(); window.scrollTo({ top: 0, behavior: "auto" }); }}
            aria-current={item.id === selectedSection ? "page" : undefined}
            className={`block rounded-[999px] border-[1.5px] border-[#010000] px-4 py-2.5 font-medium no-underline ${item.id === selectedSection ? "bg-[#010000] text-[#d8e4d6]" : "hover:bg-[#010000] hover:text-[#d8e4d6]"}`}
          >
            {item.title}
          </Link>
          {item.id === selectedSection && item.subsections.map((subsection) => (
            <div key={subsection.id} className="mt-5 border-l-[1.5px] border-[#010000] pl-4">
              <p className="mb-2 font-['Geist_Mono',monospace] text-xs uppercase tracking-wide">{subsection.title}</p>
              {subsection.articles.map((article) => (
                <Link
                  key={article.id}
                  to={article.canonicalLink}
                  onClick={closeIndex}
                  data-article-link={`article-${article.id}`}
                  aria-current={activeArticle === `article-${article.id}` ? "location" : undefined}
                  className={`mt-1 block rounded-2xl px-3 py-2 text-sm no-underline hover:bg-[#010000] hover:text-[#d8e4d6] ${activeArticle === `article-${article.id}` ? "bg-[#010000] text-[#d8e4d6]" : ""}`}
                >
                  {article.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );

  const index = navigationLoading
    ? <p role="status">Cargando índice…</p>
    : navigationRequest.messages
      ? <div role="alert"><p>{navigationRequest.messages}</p><Button variant="outline" className="mt-3" onClick={() => void dispatch(fetchWikiNavigation())}>Reintentar</Button></div>
      : sidebar;

  return (
    <DocumentationLayout>
        <Container className="grid items-start gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
          <aside ref={sidebarRef} className="sticky top-28 hidden max-h-[calc(100svh-8rem)] overflow-y-auto pr-3 lg:block">
            {index}
          </aside>
          <details ref={mobileIndexRef} className="rounded-3xl border-[1.5px] border-[#010000] p-5 lg:hidden">
            <summary className="cursor-pointer font-medium">Índice de documentación</summary>
            <div className="mt-5">{index}</div>
          </details>
          <div ref={contentRef} aria-busy={contentLoading} className="min-w-0">
            <div className="relative mb-10">
              <FormField
                label="Buscar en la documentación"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="¿Cómo podemos ayudarte?"
              />
              {searchTerm && (
                <div aria-label="Resultados de búsqueda" className="absolute z-20 mt-3 w-full rounded-3xl border-[1.5px] border-[#010000] bg-[#d8e4d6] p-3">
                  {searchPending && <p role="status" className="p-3">Buscando…</p>}
                  {!searchPending && searchRequest.messages && <p role="alert" className="p-3">{searchRequest.messages}</p>}
                  {!searchPending && !searchRequest.messages && results.length === 0 && <p className="p-3">No hay resultados publicados.</p>}
                  {!searchPending && results.map((result) => (
                    <Link
                      key={result.article_id}
                      to={`/wiki/${result.section_id}/${result.section_slug}#article-${result.article_id}`}
                      onClick={() => { setTerm(""); dispatch(clearWikiSearch()); }}
                      className="block rounded-2xl p-3 no-underline hover:bg-[#010000] hover:text-[#d8e4d6]"
                    >
                      <strong className="block font-medium">{result.title}</strong>
                      <span className="line-clamp-2 text-sm">{result.summary}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {contentLoading && <DocumentationLoadingContent />}
            {!contentLoading && sectionRequest.messages && (
              <div role="alert" className="rounded-3xl border-[1.5px] border-[#010000] p-6">
                <p>{sectionRequest.messages}</p>
                <Button variant="outline" className="mt-4" onClick={() => selectedSection && void dispatch(fetchWikiSection(selectedSection))}>Reintentar</Button>
              </div>
            )}
            {!contentLoading && !sectionRequest.messages && !visibleSection && sectionId && (
              <div className="rounded-3xl border-[1.5px] border-[#010000] p-8">
                <h2 className="text-2xl font-medium">Esta sección no está disponible</h2>
                <Link to="/wiki" className="mt-4 inline-block underline underline-offset-4">Volver a la documentación</Link>
              </div>
            )}
            {!contentLoading && !navigationRequest.messages && navigation.length === 0 && !sectionId && (
              <div className="rounded-3xl border-[1.5px] border-[#010000] p-8">
                <h2 className="text-2xl font-medium">Todavía no hay documentación publicada</h2>
                <p className="mt-3">Vuelve pronto para consultar las próximas guías.</p>
              </div>
            )}
            {!contentLoading && visibleSection?.subsections.map((subsection) => (
              <section key={subsection.id} id={`subsection-${subsection.id}`} className="mb-14 scroll-mt-28">
                <h2 className="mb-8 font-['Geist_Mono',monospace] text-sm uppercase tracking-wide">{subsection.title}</h2>
                {subsection.articles.map((article) => (
                  <article key={article.id} id={`article-${article.id}`} data-wiki-article className="mb-12 scroll-mt-28 border-b-[1.5px] border-[#010000] pb-10">
                    <h3 className="text-[clamp(2rem,3.5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.035em]">{article.title}</h3>
                    {article.summary && <p className="mt-5 text-lg leading-relaxed">{article.summary}</p>}
                    <div className="articles-content mt-6"><WikiContent nodes={article.content.content} /></div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </Container>
    </DocumentationLayout>
  );
};
