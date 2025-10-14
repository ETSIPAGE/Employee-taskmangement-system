import React from 'react';

// Extend the HTML input element attributes, but explicitly define our custom ones
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  labelClassName?: string; // Add labelClassName to the interface
}

const Input: React.FC<InputProps> = ({ label, id, labelClassName, className, ...rest }) => {
  // Destructure `className` to use for the input field itself,
  // and `labelClassName` for the label.
  // `rest` will contain all other standard input attributes like type, value, onChange, required, etc.

  const defaultInputClasses = "appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const combinedInputClasses = `${defaultInputClasses} ${className || ''}`.trim();

  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-medium text-slate-700 ${labelClassName || ''}`}>
        {label}
      </label>
      <div className="mt-1">
        <input
          id={id}
          className={combinedInputClasses} // Use the combined classes
          {...rest} // Spread the rest of the props (type, value, onChange etc.)
        />
      </div>
    </div>
  );
};

export default Input;