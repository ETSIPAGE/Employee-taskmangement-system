// File: ../shared/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  labelClassName?: string; // <--- ADD THIS LINE: Define the prop for the label
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  labelClassName, // <--- ADD THIS LINE: Destructure it from the props
  ...inputProps   // <--- Rename `props` to `inputProps` for clarity
}) => {
  return (
    <div>
      {/* Use labelClassName for the <label> element */}
      <label htmlFor={id} className={labelClassName || "block text-sm font-medium text-slate-700"}>
        {label}
      </label>
      <div className="mt-1">
        <input
          id={id}
          {...inputProps} // <--- Use `inputProps` here, which no longer contains `labelClassName`
          className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
    </div>
  );
};

export default Input;