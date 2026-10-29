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
    <div className="flex min-w-0 flex-wrap items-center gap-5 py-2">
      <img
        src={displayAvatar}
        alt="Avatar"
        className="size-28 shrink-0 rounded-full border border-[#010000]/20 object-cover sm:size-36"
      />
      <div>
        {isEditing && (
          <div>
            <label className="mb-0! inline-flex! min-h-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#010000] px-5 py-3 text-center text-sm font-medium hover:bg-[#010000] hover:text-[#d8e4d6] focus-within:outline-2 focus-within:outline-solid focus-within:outline-[#010000] focus-within:outline-offset-4">
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
          </div>
        )}
      </div>
    </div>
  );
};
