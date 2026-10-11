let cleanupReading: (() => void) | undefined;

function setupReading() {
  cleanupReading?.();
  const articleElement = document.getElementById("article");
  if (!articleElement) return;
  const article = articleElement;
  const controller = new AbortController();
  const { signal } = controller;
  for (const details of article.querySelectorAll("details")) {
    if (
      details.querySelector(":scope > summary")?.textContent?.trim() === "目录"
    ) {
      details.classList.add("inline-generated-toc");
    }
  }
  const toggle = document.getElementById("notebook-toggle");
  toggle?.addEventListener(
    "click",
    () => {
      toggle.setAttribute(
        "aria-expanded",
        String(toggle.getAttribute("aria-expanded") !== "true")
      );
    },
    { signal }
  );

  const headings = Array.from(
    article.querySelectorAll<HTMLElement>("h2[id], h3[id], h4[id]")
  );
  for (const heading of headings) {
    if (heading.querySelector(".heading-link")) continue;
    const link = document.createElement("a");
    link.className = "heading-link";
    link.href = `#${heading.id}`;
    link.setAttribute("aria-label", `链接到：${heading.textContent}`);
    link.textContent = "#";
    heading.append(link);
  }

  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("[data-toc-link]")
  );
  const progress = document.getElementById("reading-progress");
  let frame = 0;
  function updateReading() {
    frame = 0;
    const visibleHeadings = headings.filter(heading =>
      heading.checkVisibility()
    );
    const current =
      visibleHeadings.findLast(
        heading => heading.getBoundingClientRect().top <= 140
      ) ?? visibleHeadings[0];
    for (const link of links) {
      if (decodeURIComponent(link.hash.slice(1)) === current?.id)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    if (progress) {
      const top = article.getBoundingClientRect().top + window.scrollY;
      const distance = Math.max(
        1,
        article.offsetHeight - window.innerHeight + 100
      );
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, (window.scrollY - top + 100) / distance))})`;
    }
  }
  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(updateReading);
  }
  window.addEventListener("scroll", scheduleUpdate, { passive: true, signal });
  window.addEventListener("resize", scheduleUpdate, { signal });
  updateReading();
  cleanupReading = () => {
    controller.abort();
    cancelAnimationFrame(frame);
  };
}

document.addEventListener("astro:page-load", setupReading);
document.addEventListener("astro:before-swap", () => cleanupReading?.());
