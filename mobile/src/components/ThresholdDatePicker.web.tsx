import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface Props {
  value: Date;
  onChange: (event: any, date?: Date) => void;
  mode?: 'date' | 'time';
}

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const ThresholdDatePicker = ({ value, onChange }: Props) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const [view, setView] = useState<'calendar' | 'year'>('calendar');

  const generateDays = () => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: '', type: 'empty' });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, type: 'current' });
    }
    return days;
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onChange({ type: 'set' }, newDate);
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const selectYear = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setView('calendar');
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
  };

  const isSelected = (day: number) => {
    return value.getDate() === day && value.getMonth() === currentMonth.getMonth() && value.getFullYear() === currentMonth.getFullYear();
  };

  const years = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

  return (
    <Modal transparent animationType="fade" visible={true}>
      <Pressable style={styles.backdrop} onPress={() => onChange({ type: 'dismissed' })}>
        <Pressable style={styles.container}>
          <View style={styles.header}>
            {view === 'calendar' ? (
              <>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                  <Ionicons name="chevron-back" size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setView('year')}>
                  <Text style={styles.monthTitle}>
                    {MONTHS_ES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setView('calendar')} style={{ marginRight: 12 }}>
                  <Ionicons name="arrow-back" size={20} color={theme.colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>Seleccionar Año</Text>
              </View>
            )}
          </View>

          {view === 'calendar' ? (
            <>
              <View style={styles.weekDays}>
                {DAYS_ES.map(d => (
                  <Text key={d} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {generateDays().map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      item.type === 'empty' && { opacity: 0 },
                      isSelected(item.day as number) && styles.selectedDay
                    ]}
                    disabled={item.type === 'empty'}
                    onPress={() => handleDayPress(item.day as number)}
                  >
                    <Text style={[
                      styles.dayText,
                      isSelected(item.day as number) && styles.selectedDayText,
                      isToday(item.day as number) && !isSelected(item.day as number) && styles.todayText
                    ]}>
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <ScrollView style={{ height: 210 }} showsVerticalScrollIndicator={false}>
              <View style={styles.yearGrid}>
                {years.map(y => (
                  <TouchableOpacity 
                    key={y} 
                    style={[styles.yearCell, currentMonth.getFullYear() === y && styles.selectedYear]} 
                    onPress={() => selectYear(y)}
                  >
                    <Text style={[styles.yearText, currentMonth.getFullYear() === y && styles.selectedYearText]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          <TouchableOpacity 
            style={styles.closeBtn}
            onPress={() => onChange({ type: 'dismissed' })}
          >
            <Text style={styles.closeBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: 320,
    backgroundColor: theme.colors.white,
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    height: 30,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: -0.3,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 12,
  },
  selectedDay: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  selectedDayText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  todayText: {
    color: theme.colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  yearCell: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
  },
  selectedYear: {
    backgroundColor: theme.colors.primary,
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  selectedYearText: {
    color: theme.colors.white,
  },
  closeBtn: {
    marginTop: 16,
    alignSelf: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  }
});
