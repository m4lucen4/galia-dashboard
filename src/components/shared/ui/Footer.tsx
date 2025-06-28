import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 py-4 px-6 mt-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-sm text-gray-600">
            © {currentYear} Mocklab. {t("footer.allRightsReserved")}
          </div>
          <div className="flex space-x-6 text-sm">
            <Link
              to="/documentation"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              {t("footer.documentation")}
            </Link>
            <Link
              to="/privacy"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              {t("footer.privacyPolicy")}
            </Link>
            <Link
              to="/legal"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              {t("footer.legalAdvice")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
