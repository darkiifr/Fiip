import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const debounce = (fn, delay) => {
  let timeoutId;
  return function (...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const pluginKey = new PluginKey("grammar");

const extractChunks = (doc) => {
  const chunks = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "code_block") {
      return false;
    } else if (node.type.name === "paragraph") {
      chunks.push({ type: "markup", markup: "<p>" });
    } else if (node.isText) {
      chunks.push({
        type: "text",
        text: node.text,
        pos,
      });
    }
  });
  return chunks;
};

const processMatch = (match) => {
  let title = match.message,
    color = "orange";
  if (match.rule && match.rule.issueType === "misspelling") color = "red";
  return { title, color };
};

const makeDecorations = (matches, mapping) => {
  const decorations = [];
  matches.forEach((match) => {
    const map = mapping.find(
      (m) => match.offset >= m.from && match.offset < m.to
    );
    if (!map) return;
    
    const from = map.pos + match.offset - map.from;
    const to = from + match.length;
    const { title, color } = processMatch(match);
    
    const attrs = {
      class: `ProseMirror-grammar ProseMirror-grammar-${color}`,
      title,
      "data-message": match.message || "",
      "data-replacements": JSON.stringify(match.replacements?.map(r => r.value) || []),
      "data-from": String(from),
      "data-to": String(to),
    };
    
    decorations.push(Decoration.inline(from, to, attrs));
  });
  return decorations;
};

const makeLinter = (view, { languageToolCheckURL, languageToolCheck, language }) => {
  let aborter = null;

  return (chunks) => {
    const mapping = [];
    const text = chunks
      .map((chunk, i) => {
        const from = mapping.length === 0 ? 0 : mapping[mapping.length - 1].to;
        let textStr = "";
        let pos = 0;
        if (chunk.type === "markup") {
          if (chunk.markup === "<p>") textStr = i === 0 ? "" : "\n\n";
        } else {
          textStr = chunk.text;
          pos = chunk.pos;
        }
        mapping.push({from, to: from + textStr.length, pos});
        return textStr;
      })
      .join("");

    if (aborter) aborter.abort();
    aborter = new AbortController();

    const promise = languageToolCheck
      ? languageToolCheck(text, language)
      : fetch(languageToolCheckURL, {
          method: "POST",
          body: new URLSearchParams({ text, language }),
          signal: aborter.signal,
        }).then((resp) => resp.json());

    promise
      .then(({ matches }) => {
        view.dispatch(
          view.state.tr.setMeta(pluginKey, {
            decorations: makeDecorations(matches || [], mapping),
          })
        );
      })
      .catch(() => {})
      .finally(() => {
        aborter = null;
      });
  };
};

export const grammarPlugin = (options) => {
  return new Plugin({
    key: pluginKey,
    state: {
      init() {
        return { lint: null, decorationSet: DecorationSet.empty };
      },
      apply(tr, value, oldState, newState) {
        const { doc } = newState;
        if (tr.docChanged && value.lint) {
          value.lint(extractChunks(doc));
          value = {
            ...value,
            decorationSet: value.decorationSet.map(tr.mapping, doc),
          };
        }
        const meta = tr.getMeta(pluginKey);
        if (meta) {
          if (meta.lint) value = { ...value, lint: meta.lint };
          if (meta.decorations) {
            value = {
              ...value,
              decorationSet: DecorationSet.create(doc, [...meta.decorations]),
            };
          }
        }
        return value;
      },
    },
    props: {
      attributes: { spellcheck: "false" },
      decorations(state) {
        return this.getState(state)?.decorationSet;
      },
      handleDOMEvents: {
        contextmenu(view, event) {
          const target = event.target;
          if (target && target.classList.contains("ProseMirror-grammar")) {
            event.preventDefault();
            const replacementsStr = target.getAttribute("data-replacements");
            // const replacements = replacementsStr ? JSON.parse(replacementsStr) : [];
            const message = target.getAttribute("data-message");
            const from = parseInt(target.getAttribute("data-from"), 10);
            const to = parseInt(target.getAttribute("data-to"), 10);

            const customEvent = new CustomEvent("languagetool:contextmenu", {
              detail: {
                x: event.clientX,
                y: event.clientY,
                replacementsStr,
                message,
                from,
                to,
                view
              }
            });
            window.dispatchEvent(customEvent);
            return true; // handled
          }
          return false;
        }
      }
    },
    view(view) {
      if (pluginKey.getState(view.state).lint) return {};
      const lint = debounce(makeLinter(view, options), 1000);
      view.dispatch(view.state.tr.setMeta(pluginKey, { lint }));
      if (view.state.doc.textContent.trim() !== "") {
        lint(extractChunks(view.state.doc));
      }
      return {};
    },
  });
};
