import React, { useEffect, useState } from "react";
import { CreateUserProps } from "../../redux/actions/UserActions";
import { InputField } from "../shared/ui/InputField";
import { Button } from "../shared/ui/Button";

interface UsersFormProps {
  initialData?: CreateUserProps;
  onSubmit: (userData: CreateUserProps) => void;
  loading: boolean;
  isEditMode?: boolean;
}

export const UsersForm: React.FC<UsersFormProps> = ({
  initialData,
  onSubmit,
  loading,
  isEditMode = false,
}) => {
  const defaultFormData: CreateUserProps = {
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    active: true,
    phone: "",
    company: "",
    vat: "",
    role: "customer",
  };

  const [formData, setFormData] = useState<CreateUserProps>(
    initialData || defaultFormData
  );

  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode && formData.password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (
      isEditMode &&
      formData.password !== "" &&
      formData.password.length < 6
    ) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="first_name"
          label="First Name"
          type="text"
          value={formData.first_name}
          onChange={handleChange}
          required
        />
        <InputField
          id="last_name"
          label="Last Name"
          type="text"
          value={formData.last_name}
          onChange={handleChange}
          required
        />
        <InputField
          id="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isEditMode}
        />
        <InputField
          id="phone"
          label="Phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          required
        />
        <InputField
          id="company"
          label="Company"
          type="text"
          value={formData.company}
          onChange={handleChange}
        />
        <InputField
          id="vat"
          label="VAT"
          type="text"
          value={formData.vat}
          onChange={handleChange}
          required
        />
        {isEditMode ? null : (
          <InputField
            id="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required={!isEditMode}
            error={passwordError}
          />
        )}
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="customer">Customer</option>
            <option value="publisher">Publisher</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="active"
            name="active"
            checked={formData.active}
            onChange={handleChange}
            className="h-4 w-4 text-black focus:ring-gray-400 border-gray-300 rounded"
          />
          <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
            Active?
          </label>
        </div>
      </div>
      <div className="mt-6">
        <Button
          fullWidth
          title={isEditMode ? "Edit User" : "Create User"}
          disabled={loading}
          type="submit"
        />
      </div>
    </form>
  );
};
