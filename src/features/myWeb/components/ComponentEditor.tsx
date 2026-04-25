import React from "react";
import { SiteComponentDataProps } from "../../../types";
import { HeaderEditor } from "./HeaderEditor";
import { CTAEditor } from "./CTAEditor";
import { BodyEditor } from "./BodyEditor";
import { ContentEditor } from "./ContentEditor";
import { ContactEditor } from "./ContactEditor";

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
    default:
      return (
        <p className="text-sm text-gray-500">
          Tipo de componente no soportado: {component.type}
        </p>
      );
  }
};
