import React from "react";
import { SiteComponentDataProps } from "../../../types";
import { HeaderEditor } from "./HeaderEditor";
import { CTAEditor } from "./CTAEditor";
import { BodyEditor } from "./BodyEditor";
import { ContentEditor } from "./ContentEditor";
import { ContactEditor } from "./ContactEditor";
import { ProjectColumnsEditor } from "./ProjectColumnsEditor";
import { RichTextBlockEditor } from "./RichTextBlockEditor";
import { SeparatorEditor } from "./SeparatorEditor";

interface ComponentEditorProps {
  component: SiteComponentDataProps;
}

export const ComponentEditor: React.FC<ComponentEditorProps> = ({
  component,
}) => {
  switch (component.type) {
    case "header":
      return <HeaderEditor component={component} />;
    case "cta":
      return <CTAEditor component={component} />;
    case "body":
      return <BodyEditor component={component} />;
    case "content":
      return <ContentEditor component={component} />;
    case "contact":
      return <ContactEditor component={component} />;
    case "project_columns":
      return <ProjectColumnsEditor component={component} />;
    case "rich_text":
      return <RichTextBlockEditor component={component} />;
    case "separator":
      return <SeparatorEditor component={component} />;
    default:
      return (
        <p className="text-sm text-gray-500">
          Tipo de componente no soportado: {component.type}
        </p>
      );
  }
};
