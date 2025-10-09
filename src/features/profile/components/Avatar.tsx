import { useTranslation } from "react-i18next";

interface AvatarProps {
  displayAvatar: string;
  isEditing: boolean;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Avatar = ({
  displayAvatar,
  isEditing,
  onAvatarChange,
}: AvatarProps) => {
  const { t } = useTranslation();

  return (
    <div className="py-6 flex items-center gap-4">
      <img
        src={displayAvatar}
        alt="Avatar"
        className="h-40 w-40 rounded-full object-cover border"
      />
      <div>
        {isEditing && (
          <dd className="mt-2">
            <label className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-gray-900 text-white hover:bg-black cursor-pointer">
              <input
                id="avatarFile"
                name="avatarFile"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onAvatarChange}
              />
              {t("profile.changeAvatar")}
            </label>
          </dd>
        )}
      </div>
    </div>
  );
};
