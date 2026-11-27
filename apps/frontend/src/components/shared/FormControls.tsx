import React from 'react';

const baseControlClasses =
  'rounded-xl border border-[var(--pm-border)] outline-none focus:border-[var(--pm-accent)]';

export type FormInputProps = React.InputHTMLAttributes<HTMLInputElement>;
export type FormTextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const FormInput: React.FC<FormInputProps> = ({ className = '', ...props }) => (
  <input {...props} className={`${baseControlClasses} ${className}`} />
);

export const FormTextArea: React.FC<FormTextAreaProps> = ({
  className = '',
  ...props
}) => <textarea {...props} className={`${baseControlClasses} ${className}`} />;

export const FormSelect: React.FC<FormSelectProps> = ({ className = '', ...props }) => (
  <select {...props} className={`${baseControlClasses} ${className}`} />
);
