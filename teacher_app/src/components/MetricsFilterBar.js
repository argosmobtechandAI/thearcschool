import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Calendar } from 'react-native-calendars';
import { colors, shadows } from '../theme/colors';

const MetricsFilterBar = ({ 
  searchQuery, 
  setSearchQuery, 
  sortOrder, 
  setSortOrder, 
  startDate, 
  setStartDate, 
  endDate, 
  setEndDate,
  searchPlaceholder = "Search...",
  sortLabelAsc = "Oldest",
  sortLabelDesc = "Newest",
  sortIconAsc = "arrow-up",
  sortIconDesc = "arrow-down"
}) => {
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  const handleDayPress = (day) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // Start a new selection
      setTempStart(day.dateString);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      // If selected date is before start date, make it the new start
      if (new Date(day.dateString) < new Date(tempStart)) {
        setTempStart(day.dateString);
      } else {
        setTempEnd(day.dateString);
      }
    }
  };

  const getMarkedDates = () => {
    const marks = {};
    if (tempStart) {
      marks[tempStart] = { startingDay: true, color: colors.primary, textColor: 'white' };
      if (!tempEnd) {
        marks[tempStart].endingDay = true;
      }
    }
    if (tempStart && tempEnd) {
      let start = new Date(tempStart);
      let end = new Date(tempEnd);
      
      let curr = new Date(start);
      curr.setDate(curr.getDate() + 1);
      
      while (curr < end) {
        const dateStr = curr.toISOString().split('T')[0];
        marks[dateStr] = { color: colors.primary + '50', textColor: colors.text };
        curr.setDate(curr.getDate() + 1);
      }
      
      marks[tempEnd] = { endingDay: true, color: colors.primary, textColor: 'white' };
    }
    return marks;
  };

  const applyDates = () => {
    setStartDate(tempStart);
    setEndDate(tempEnd || tempStart); // if only one date is picked, range is that single day
    setCalendarVisible(false);
  };

  const clearDates = () => {
    setTempStart(null);
    setTempEnd(null);
    setStartDate(null);
    setEndDate(null);
    setCalendarVisible(false);
  };

  const hasDateFilter = !!startDate;

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput 
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.actionBtn}
        onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
      >
        <Icon name={sortOrder === 'asc' ? sortIconAsc : sortIconDesc} size={16} color={colors.primary} />
        <Text style={styles.actionBtnText}>{sortOrder === 'asc' ? sortLabelAsc : sortLabelDesc}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionBtn, hasDateFilter && styles.actionBtnActive]}
        onPress={() => {
          setTempStart(startDate);
          setTempEnd(endDate);
          setCalendarVisible(true);
        }}
      >
        <Icon name="calendar" size={16} color={hasDateFilter ? '#FFF' : colors.primary} />
        {hasDateFilter && (
          <View style={styles.badgeIndicator} />
        )}
      </TouchableOpacity>

      {/* Date Range Picker Modal */}
      <Modal visible={isCalendarVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setCalendarVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.calendarContainer}>
                <Text style={styles.modalTitle}>Select Date Range</Text>
                
                <Calendar
                  markingType={'period'}
                  markedDates={getMarkedDates()}
                  onDayPress={handleDayPress}
                  theme={{
                    todayTextColor: colors.primary,
                    arrowColor: colors.primary,
                  }}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.clearBtn} onPress={clearDates}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setCalendarVisible(false)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.applyBtn} onPress={applyDates}>
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: colors.background,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    height: 44,
  },
  actionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  badgeIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    ...shadows.card,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default MetricsFilterBar;
