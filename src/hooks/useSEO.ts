import { useEffect } from "react";
import { dbSelect } from "@/lib/api";

function setMeta(selector: string, attr: string, value: string) {
  if (!value) return;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    const [attrName, attrVal] = selector.replace("meta[", "").replace("]", "").split("=");
    el.setAttribute(attrName, attrVal.replace(/"/g, ""));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function useSEO(pageKey = "home") {
  useEffect(() => {
    const load = async () => {
      const { data } = await dbSelect(
        "seo_settings",
        { page_key: pageKey },
        { single: true }
      );
      if (!data) return;
      if (data.title)       document.title = data.title;
      if (data.description) setMeta('meta[name="description"]',         "content", data.description);
      if (data.keywords)    setMeta('meta[name="keywords"]',            "content", data.keywords);
      if (data.title)       setMeta('meta[property="og:title"]',        "content", data.title);
      if (data.description) setMeta('meta[property="og:description"]',  "content", data.description);
      if (data.og_image)    setMeta('meta[property="og:image"]',        "content", data.og_image);
      if (data.title)       setMeta('meta[name="twitter:title"]',       "content", data.title);
      if (data.description) setMeta('meta[name="twitter:description"]', "content", data.description);
      if (data.og_image)    setMeta('meta[name="twitter:image"]',       "content", data.og_image);
    };
    load();
  }, [pageKey]);
}
