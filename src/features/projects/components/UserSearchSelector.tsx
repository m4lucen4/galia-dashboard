import { useState } from "react";
import { UserDataProps } from "../../../types";

interface UserSearchSelectorProps {
  users: UserDataProps[];
  selectedUser: string | null;
  onUserSelect: (userId: string | null) => void;
}

export const UserSearchSelector: React.FC<UserSearchSelectorProps> = ({
  users,
  selectedUser,
  onUserSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter users based on search term and show selected user always
  const filteredUsers = (() => {
    const customerUsers = users.filter(
      (user) => user.role === "customer" || user.role === "photographer",
    );

    if (searchTerm.length >= 3) {
      // Show search results
      const searchLower = searchTerm.toLowerCase();
      return customerUsers.filter(
        (user) =>
          user.first_name.toLowerCase().includes(searchLower) ||
          user.last_name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower),
      );
    } else if (selectedUser) {
      // Show only the selected user if no search is active
      return customerUsers.filter((user) => user.uid === selectedUser);
    } else {
      // No search and no selected user
      return [];
    }
  })();

  const handleUserClick = (userId: string) => {
    // If clicking the same user, deselect it
    if (selectedUser === userId) {
      onUserSelect(null);
    } else {
      onUserSelect(userId);
    }
  };

  return (
    <div className="space-y-4 font-['Hanken_Grotesk'] text-[#010000]">
      {/* Input de búsqueda */}
      <div>
        <label
          htmlFor="userSearch"
          className="mb-2 block text-sm font-medium"
        >
          Buscar usuario
        </label>
        <input
          id="userSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="min-h-12 w-full rounded-full border-[1.5px] border-[#010000]/50 bg-white/30 px-5 py-3 text-sm placeholder:text-[#010000]/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
        />
      </div>

      {/* Lista de usuarios filtrados */}
      <div className="max-h-48 overflow-y-auto overscroll-contain rounded-[28px] border border-[#010000]/30 bg-white/20">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <button
              key={user.uid}
              type="button"
              aria-pressed={selectedUser === user.uid}
              className={`block w-full cursor-pointer border-b border-[#010000]/15 p-4 text-left last:border-b-0 hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#010000] ${
                selectedUser === user.uid ? "bg-[#010000]/10" : ""
              }`}
              onClick={() => handleUserClick(user.uid)}
            >
              <span className="flex items-center gap-3">
                <span className="min-w-0 flex-1 wrap-break-word">
                  <span className="block text-sm font-semibold">
                    {user.first_name} {user.last_name}
                  </span>
                  <span className="block text-sm text-[#010000]/70">{user.email}</span>
                  {user.company && (
                    <span className="mt-1 block text-xs text-[#010000]/65">{user.company}</span>
                  )}
                  {user.folder_nas && (
                    <span className="mt-1 block break-all font-mono text-xs text-[#010000]/65">
                      Carpeta NAS: {user.folder_nas}
                    </span>
                  )}
                </span>
                {selectedUser === user.uid && (
                  <span className="shrink-0">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#010000]">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="currentColor"
                        viewBox="0 0 8 8"
                      >
                        <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                      </svg>
                    </span>
                  </span>
                )}
              </span>
            </button>
          ))
        ) : (
          <div className="px-5 py-7 text-center text-sm leading-relaxed text-[#010000]/65">
            {searchTerm.length >= 3
              ? "No se encontraron usuarios con rol 'customer'"
              : searchTerm.length > 0
                ? `Escribe al menos ${3 - searchTerm.length} caracteres más para buscar`
                : selectedUser
                  ? "No hay usuario asignado actualmente. Escribe al menos 3 caracteres para buscar usuarios."
                  : "Escribe al menos 3 caracteres para buscar usuarios"}
          </div>
        )}
      </div>
    </div>
  );
};
