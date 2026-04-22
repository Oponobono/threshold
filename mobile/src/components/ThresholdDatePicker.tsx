import React from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

interface Props {
  value: Date;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  mode?: 'date' | 'time';
}

export const ThresholdDatePicker = ({ value, onChange, mode = 'date' }: Props) => {
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      onChange={onChange}
    />
  );
};
