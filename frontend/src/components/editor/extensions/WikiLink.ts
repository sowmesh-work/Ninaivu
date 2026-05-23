import { mergeAttributes, Node } from "@tiptap/core";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";

export type WikiLinkOptions = {
  suggestion: Omit<SuggestionOptions, "editor">;
  onNavigate?: (pageId: string) => void;
};

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addOptions() {
    return {
      suggestion: {
        char: "[[",
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: "wikiLink",
                attrs: { id: props.id, label: props.label },
              },
              { type: "text", text: " " },
            ])
            .run();
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes.wikiLink;
          return !!$from.parent.type.contentMatch.matchType(type);
        },
      },
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-id"),
        renderHTML: (attrs) => ({ "data-id": attrs.id }),
      },
      label: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-label"),
        renderHTML: (attrs) => ({ "data-label": attrs.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wiki-link]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { "data-wiki-link": "", class: "wiki-link" },
        HTMLAttributes
      ),
      `[[${node.attrs.label ?? ""}]]`,
    ];
  },

  renderText({ node }) {
    return `[[${node.attrs.label ?? ""}]]`;
  },

  addKeyboardShortcuts() {
    return {};
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
