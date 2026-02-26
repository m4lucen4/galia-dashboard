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
    <div className="space-y-4">
      {/* Input de búsqueda */}
      <div>
        <label
          htmlFor="userSearch"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Buscar usuario
        </label>
        <input
          id="userSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Lista de usuarios filtrados */}
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.uid}
              className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                selectedUser === user.uid ? "bg-blue-50 border-blue-200" : ""
              }`}
              onClick={() => handleUserClick(user.uid)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  {user.company && (
                    <p className="text-xs text-gray-400">{user.company}</p>
                  )}
                  {user.folder_nas && (
                    <p className="text-xs text-red-400">
                      Carpeta NAS: {user.folder_nas}
                    </p>
                  )}
                </div>
                {selectedUser === user.uid && (
                  <div className="shrink-0">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="currentColor"
                        viewBox="0 0 8 8"
                      >
                        <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
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
