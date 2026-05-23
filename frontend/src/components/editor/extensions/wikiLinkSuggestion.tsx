import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { WikiLinkPopup, WikiLinkPopupRef } from "../WikiLinkPopup";

export const wikiLinkSuggestion = {
  char: "[[",
  startOfLine: false,

  items: async ({ query }: { query: string }) => {
    // Items are fetched inside WikiLinkPopup — return empty here
    return [];
  },

  render: () => {
    let component: ReactRenderer<WikiLinkPopupRef> | null = null;
    let popup: TippyInstance[] | null = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(WikiLinkPopup, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
          theme: "ninaivu",
        });
      },

      onUpdate(props: any) {
        component?.updateProps(props);
        if (!props.clientRect) return;
        popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect });
      },

      onKeyDown(props: any) {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        popup?.[0]?.destroy();
        component?.destroy();
        popup = null;
        component = null;
      },
    };
  },
};
