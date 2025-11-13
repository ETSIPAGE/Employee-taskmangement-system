import React from 'react';

// Extend the HTML input element attributes, but explicitly define our custom ones
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  labelClassName?: string; // Add labelClassName to the interface
  showPasswordToggle?: boolean;
}

const Input: React.FC<InputProps> = ({ label, id, labelClassName, className, showPasswordToggle, ...rest }) => {
  // Destructure `className` to use for the input field itself,
  // and `labelClassName` for the label.
  // `rest` will contain all other standard input attributes like type, value, onChange, required, etc.

  const defaultInputClasses = "appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
  const [visible, setVisible] = React.useState(false);
  const { type, ...restProps } = rest as any;
  const inputType = type === 'password' && showPasswordToggle ? (visible ? 'text' : 'password') : type;
  const inputClasses = `${defaultInputClasses} ${className || ''} ${type === 'password' && showPasswordToggle ? 'pr-10' : ''}`.trim();

  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-medium text-slate-700 ${labelClassName || ''}`}>
        {label}
      </label>
      <div className="mt-1 relative">
        <input
          id={id}
          className={inputClasses}
          type={inputType}
          {...restProps}
        />
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="absolute inset-y-0 right-2 flex items-center p-2 text-slate-500 hover:text-slate-700"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? (
              // Eye-off icon
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M2.75 3.44a.75.75 0 1 0-1.06 1.06l3.02 3.02A12.2 12.2 0 0 0 1.5 12c1.46 3.33 5.27 7 10.5 7 2.03 0 3.84-.57 5.39-1.46l3.86 3.86a.75.75 0 1 0 1.06-1.06l-18.56-18.9Zm6.32 7.38 4.11 4.18a3 3 0 0 1-4.11-4.18Zm12.61 4.64a16.46 16.46 0 0 0 1.82-3.46C22.04 8.67 18.23 5 13 5c-1.18 0-2.3.18-3.35.5l2.24 2.28A6 6 0 0 1 19 12a6 6 0 0 1-1.97 4.45c1.58-.75 2.92-1.97 4-3.59Z"/>
              </svg>
            ) : (
              // Eye icon
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 5c5.23 0 9.04 3.67 10.5 7-1.46 3.33-5.27 7-10.5 7S2.96 15.33 1.5 12C2.96 8.67 6.77 5 12 5Zm0 2C7.99 7 4.79 9.66 3.53 12 4.79 14.34 7.99 17 12 17s7.21-2.66 8.47-5c-1.26-2.34-4.46-5-8.47-5Zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5Z"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default Input;