import React from 'react';
import Select from 'react-select';

const CustomSelect = ({ options, value, onChange, placeholder = "Search...", disabled = false, isMulti = false }) => {
  // Sort options alphabetically by label
  const sortedOptions = Array.isArray(options) ? [...options].sort((a, b) => {
    return String((a && a.label) || '').localeCompare(String((b && b.label) || ''), undefined, { numeric: true, sensitivity: 'base' });
  }) : [];

  let selectedOption;
  if (isMulti) {
    selectedOption = sortedOptions.filter(opt => (value || []).includes(opt.value));
  } else {
    selectedOption = sortedOptions.find(opt => opt.value === value) || null;
  }

  const handleChange = (selected) => {
    if (isMulti) {
      onChange(selected ? selected.map(s => s.value) : []);
    } else {
      onChange(selected ? selected.value : "");
    }
  };

  return (
    <Select
      options={sortedOptions}
      value={selectedOption}
      onChange={handleChange}
      isDisabled={disabled}
      isClearable
      isMulti={isMulti}
      placeholder={placeholder}
      styles={{
        control: (base) => ({
          ...base,
          minHeight: '36px',
          height: isMulti ? 'auto' : '36px',
          borderRadius: '8px',
          borderColor: 'var(--glass-border)',
          background: 'rgba(255, 255, 255, 0.5)',
          fontSize: '0.875rem',
          boxShadow: 'none',
          '&:hover': {
            borderColor: '#3b82f6'
          }
        }),
        valueContainer: (base) => ({
          ...base,
          padding: '0 8px'
        }),
        input: (base) => ({
          ...base,
          margin: 0,
          padding: 0
        }),
        menu: (base) => ({
          ...base,
          zIndex: 100,
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }),
        option: (base, state) => ({
          ...base,
          fontSize: '0.875rem',
          color: '#1e293b',
          backgroundColor: state.isSelected ? '#bfdbfe' : state.isFocused ? '#e0f2fe' : 'transparent',
          cursor: 'pointer',
          '&:active': {
            backgroundColor: '#bfdbfe'
          }
        }),
        multiValue: (base) => ({
          ...base,
          backgroundColor: '#e0f2fe',
          borderRadius: '4px'
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: '#0369a1',
          fontSize: '0.75rem'
        })
      }}
    />
  );
};

export default CustomSelect;
