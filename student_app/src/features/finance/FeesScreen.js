import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { theme } from '../../theme/theme';
import { useGetFeesQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';
import { useSelector, useDispatch } from 'react-redux';
import { generateReceiptPDF } from '../../utils/exportUtils';
import { BarChart } from 'react-native-gifted-charts';
import { setAcademicYear } from '../../store/settingsSlice';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Chip from '../../components/Chip';

const FeesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { openDrawer } = useDrawer();
    const [activeTab, setActiveTab] = useState('current'); // 'current' | 'history' | 'structure'
  const [selectedFee, setSelectedFee] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const getCurrentAcademicYear = () => {
    const today = new Date();
    const month = today.getMonth();
    let year = today.getFullYear();
    if (month < 3) year -= 1;
    return `${year}-${year + 1}`;
  };

  const getAvailableYears = () => {
    const current = getCurrentAcademicYear();
    const currentStartYear = parseInt(current.split('-')[0]);
    return [
      `${currentStartYear - 2}-${currentStartYear - 1}`,
      `${currentStartYear - 1}-${currentStartYear}`,
      current
    ];
  };

  const academicYear = useSelector(state => state.settings.academicYear);
  const { data, isLoading, isFetching, refetch } = useGetFeesQuery(academicYear, { refetchOnMountOrArgChange: true });
  const availableYears = getAvailableYears();

  const onRefresh = useCallback(async () => {
        await refetch();
      }, [refetch]);

  const fees = data?.fees || [];
  const feeStructure = data?.feeStructure || [];
  const lateFeePenalty = data?.lateFeePenalty || 10;

  const currentDues = fees.filter(f => f.status === 'pending' || f.status === 'overdue');
  const historicalFees = fees.filter(f => f.status === 'paid');

  const globalTotalDue = fees.reduce((sum, f) => sum + Number(f.fee?.amount || 0), 0);
  const totalPaid = fees.reduce((sum, f) => sum + Number(f.total_paid_amount || 0), 0);
  const totalDue = Math.max(0, globalTotalDue - totalPaid);
  
  const payments = data?.payments || [];

  const formatCompactNumber = (number) => {
    if (number < 1000) return number.toString();
    if (number < 100000) return (number / 1000).toFixed(number % 1000 === 0 ? 0 : 1) + 'K';
    return (number / 100000).toFixed(number % 100000 === 0 ? 0 : 1) + 'L';
  };

  const generateChartData = (duesArray) => {
    if (!duesArray || duesArray.length === 0) return [];
    const monthMap = {};
    const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    monthNames.forEach(m => monthMap[m] = { due: 0, paid: 0 });

    duesArray.forEach(due => {
      const date = new Date(due.fee.due_date);
      const mName = date.toLocaleString('en-US', { month: 'short' });
      if (monthMap[mName]) {
         monthMap[mName].due += Number(due.fee.amount || 0);
         monthMap[mName].paid += Number(due.total_paid_amount || 0);
      }
    });

    const chartData = [];
    monthNames.forEach(m => {
       const d = monthMap[m];
       const balance = Math.max(0, d.due - d.paid);
       if (d.due > 0 || d.paid > 0) {
         chartData.push({
           value: d.due,
           label: m,
           spacing: 2,
           labelWidth: 30,
           labelTextStyle: { color: theme.colors.textMuted, fontSize: 10, fontFamily: theme.typography.fontFamily.bold },
           frontColor: theme.colors.secondary,
           topLabelComponent: () => {
             if (balance === 0) return null;
             return (
               <View style={{ width: 50, marginLeft: -19, alignItems: 'center', marginBottom: 2 }}>
                 <Text style={{ color: theme.colors.success, fontSize: 10, fontFamily: theme.typography.fontFamily.bold }} numberOfLines={1} adjustsFontSizeToFit>
                   ₹{formatCompactNumber(balance)}
                 </Text>
               </View>
             );
           }
         });
         chartData.push({
           value: d.paid,
           frontColor: theme.colors.primary
         });
       }
    });
    return chartData;
  };
  const chartData = generateChartData(fees);

  const getStatusColor = (status) => {
    if (status === 'paid') return theme.colors.success;
    if (status === 'overdue') return theme.colors.danger;
    return theme.colors.warning; // pending
  };

  const handlePressFee = (record) => {
    setSelectedFee(record);
    setModalVisible(true);
  };

  const renderFeeCard = (record) => {
    const feeInfo = record.fee;
    const isPaid = record.status === 'paid';
    
    let totalAmount = Number(feeInfo?.amount || 0);
    if (record.status === 'overdue') totalAmount += lateFeePenalty;

    return (
      <TouchableOpacity 
        key={record.id} 
        style={styles.feeCard}
        activeOpacity={0.7}
        onPress={() => handlePressFee(record)}
      >
        <View style={styles.feeTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.feeTitle}>{feeInfo?.title || 'School Fee'}</Text>
            <Text style={styles.feeType}>{feeInfo?.type || 'Tuition'}</Text>
          </View>
          <Text style={styles.feeAmount}>₹{totalAmount.toLocaleString()}</Text>
        </View>

        <View style={styles.feeBottomRow}>
          <View>
            <Text style={styles.dueDate}>Due: {new Date(feeInfo?.due_date).toLocaleDateString()}</Text>
            {isPaid && record.payment_date && (
               <Text style={{...styles.dueDate, marginTop: 2, color: theme.colors.success}}>Paid: {new Date(record.payment_date).toLocaleDateString()}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isPaid && (
              <>
                <TouchableOpacity onPress={() => generateReceiptPDF(record, user)} style={styles.iconActionBtn}>
                  <Icon name="download" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => generateReceiptPDF(record, user)} style={styles.iconActionBtn}>
                  <Icon name="share-2" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            )}
            <View style={[styles.statusChip, { backgroundColor: getStatusColor(record.status) + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(record.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                {record.status?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStructureCard = (feeInfo) => {
    let baseCategory = feeInfo?.fee_category || 'Generic';
    let frequency = 'Monthly';
    if (baseCategory.endsWith('_annual')) { frequency = 'Annual'; baseCategory = baseCategory.replace('_annual', ''); }
    else if (baseCategory.endsWith('_one_time')) { frequency = 'One-time'; baseCategory = baseCategory.replace('_one_time', ''); }
    else if (baseCategory.endsWith('_monthly')) { frequency = 'Monthly'; baseCategory = baseCategory.replace('_monthly', ''); }
    
    const title = baseCategory.split(/[_ ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
      <View key={feeInfo.id} style={styles.feeCard}>
        <View style={styles.feeTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.feeTitle}>{title}</Text>
            <Text style={styles.feeType}>{frequency}</Text>
          </View>
          <Text style={styles.feeAmount}>₹{Number(feeInfo?.amount || 0).toLocaleString()}</Text>
        </View>

        <View style={styles.feeBottomRow}>
          <Text style={styles.dueDate}>Applies to: {feeInfo?.class_name || 'All Classes'}</Text>
          <View style={[styles.statusChip, { backgroundColor: theme.colors.primary + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>STANDARD FEE</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPaymentCard = (payment) => {
    return (
      <View key={payment.id} style={styles.feeCard}>
        <View style={styles.feeTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.feeTitle}>Receipt: #{payment.id.split('-')[0].toUpperCase()}</Text>
            <Text style={styles.feeType}>{payment.payment_mode || 'Cash/Bank'}</Text>
          </View>
          <Text style={styles.feeAmount}>₹{Number(payment.amount_paid || 0).toLocaleString()}</Text>
        </View>

        <View style={styles.feeBottomRow}>
          <Text style={styles.dueDate}>Paid on: {new Date(payment.created_at).toLocaleDateString()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => generateReceiptPDF(payment, user)} style={styles.iconActionBtn}>
              <Icon name="download" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => generateReceiptPDF(payment, user)} style={styles.iconActionBtn}>
              <Icon name="share-2" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            <View style={[styles.statusChip, { backgroundColor: getStatusColor('paid') + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor('paid') }]} />
              <Text style={[styles.statusText, { color: getStatusColor('paid') }]}>SUCCESS</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const displayedFees = activeTab === 'current' ? currentDues : activeTab === 'history' ? payments : feeStructure;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.headerBtn}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>The Arc School</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Icon name="bell" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Fees & Finance</Text>
          <Text style={styles.pageSubtitle}>Track your invoices and ledger</Text>
        </View>

        {/* Academic Year Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll} contentContainerStyle={styles.yearScrollContent}>
          {availableYears.map(year => (
            <TouchableOpacity 
              key={year} 
              style={[styles.yearChip, academicYear === year && styles.yearChipActive]}
              onPress={() => {
                if (academicYear === year) refetch();
                else dispatch(setAcademicYear(year));
              }}
            >
              <Text style={[styles.yearChipText, academicYear === year && styles.yearChipTextActive]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading && !isFetching ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Summary Chart Card */}
            <Card variant="elevated" style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View style={styles.chartSummaryBox}>
                  <Text style={styles.chartSummaryLabel}>Total Outstanding</Text>
                  <Text style={styles.chartSummaryValueDue}>₹{totalDue.toLocaleString()}</Text>
                </View>
                <View style={styles.chartSummaryBox}>
                  <Text style={styles.chartSummaryLabel}>Total Paid</Text>
                  <Text style={styles.chartSummaryValuePaid}>₹{totalPaid.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.chartLegend}>
                 <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: theme.colors.secondary}]}/><Text style={styles.legendText}>Due</Text></View>
                 <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: theme.colors.primary}]}/><Text style={styles.legendText}>Paid</Text></View>
              </View>
              {chartData.length > 0 ? (
                <View style={{ marginTop: 20, alignItems: 'center' }}>
                  <BarChart 
                    data={chartData} 
                    barWidth={12} 
                    spacing={24} 
                    roundedTop 
                    xAxisThickness={0} 
                    yAxisThickness={0} 
                    yAxisTextStyle={{color: theme.colors.textMuted, fontSize: 10, fontFamily: theme.typography.fontFamily.bold}}
                    noOfSections={4}
                    hideRules
                    initialSpacing={10}
                    animationDuration={300}
                    isAnimated
                  />
                </View>
              ) : (
                <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.medium}}>No data available for chart</Text>
                </View>
              )}
            </Card>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'current' && styles.tabBtnActive]}
                onPress={() => setActiveTab('current')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'current' && styles.tabBtnTextActive]}>Current Dues</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
                onPress={() => setActiveTab('history')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>Ledger</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'structure' && styles.tabBtnActive]}
                onPress={() => setActiveTab('structure')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'structure' && styles.tabBtnTextActive]}>Structure</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
              {displayedFees.length > 0 ? (
                activeTab === 'structure' ? displayedFees.map(renderStructureCard) : activeTab === 'history' ? displayedFees.map(renderPaymentCard) : displayedFees.map(renderFeeCard)
              ) : (
                <View style={styles.emptyState}>
                  <Icon name={activeTab === 'current' ? "check-circle" : "file-text"} size={48} color={theme.colors.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'current' ? 'All Clear!' : activeTab === 'structure' ? 'No Fee Structure' : 'No History'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {activeTab === 'current' 
                      ? 'You have no pending fees at the moment.' 
                      : activeTab === 'structure'
                      ? 'The school has not published a fee structure yet.'
                      : 'No past fee records found in your ledger.'}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fee Breakdown Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            {selectedFee && (() => {
              const feeInfo = selectedFee.fee;
              const isPaid = selectedFee.status === 'paid';
              const penalty = Number(feeInfo?.penalty || 0);
              const totalAmount = Number(feeInfo?.amount || 0);
              const trueBaseAmount = totalAmount - penalty;

              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{isPaid ? 'Digital Receipt' : 'Fee Structure'}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Icon name="x" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={styles.modalFeeName}>{feeInfo?.title || 'School Fee'}</Text>
                    <Text style={styles.modalFeeType}>{feeInfo?.type || 'Tuition'}</Text>
                    
                    <View style={styles.receiptBox}>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Base Amount</Text>
                        <Text style={styles.receiptValue}>₹{trueBaseAmount.toLocaleString()}</Text>
                      </View>
                      
                      {penalty > 0 && (
                        <View style={styles.receiptRow}>
                          <Text style={styles.receiptLabel}>Late Fee Penalty</Text>
                          <Text style={styles.receiptValue}>₹{penalty.toLocaleString()}</Text>
                        </View>
                      )}

                      <View style={[styles.receiptRow, styles.receiptTotalRow]}>
                        <Text style={styles.receiptTotalLabel}>{isPaid ? 'Total Paid' : 'Total Payable'}</Text>
                        <Text style={styles.receiptTotalValue}>₹{totalAmount.toLocaleString()}</Text>
                      </View>
                    </View>

                    <View style={styles.detailsBox}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Status</Text>
                        <Text style={[styles.detailValue, { color: getStatusColor(selectedFee.status), fontWeight: '700' }]}>
                          {selectedFee.status?.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Due Date</Text>
                        <Text style={styles.detailValue}>{new Date(feeInfo?.due_date).toLocaleDateString()}</Text>
                      </View>
                      {isPaid && (
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Payment Date</Text>
                          <Text style={styles.detailValue}>{selectedFee.payment_date ? new Date(selectedFee.payment_date).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                      )}
                    </View>

                    {!isPaid && (
                      <View style={styles.infoBox}>
                        <Icon name="info" size={16} color={theme.colors.primary} />
                        <Text style={styles.infoText}>Please clear the outstanding dues at the school fee counter.</Text>
                      </View>
                    )}
                    {isPaid && (
                      <Button 
                        label="Download Receipt"
                        icon="download"
                        onPress={() => generateReceiptPDF(selectedFee, user)}
                        style={{ marginTop: 16 }}
                      />
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.primary },
  scroll: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },

  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: theme.typography.fontSize.lg, fontFamily: theme.typography.fontFamily.heading },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  pageHeader: { paddingHorizontal: 24, paddingVertical: 20 },
  pageTitle: { fontSize: 32, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: theme.typography.fontSize.md, fontFamily: theme.typography.fontFamily.medium, color: theme.colors.textMuted },
  
  yearScroll: { paddingBottom: 16 },
  yearScrollContent: { paddingHorizontal: 24, gap: 10 },
  yearChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.borderLight },
  yearChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  yearChipText: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted },
  yearChipTextActive: { color: '#fff' },

  chartCard: {
    marginHorizontal: theme.spacing.md, marginBottom: 20,
    backgroundColor: theme.colors.surface,
    padding: 20,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  chartSummaryBox: { flex: 1 },
  chartSummaryLabel: { fontSize: 13, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.bold, marginBottom: 4 },
  chartSummaryValueDue: { fontSize: 24, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  chartSummaryValuePaid: { fontSize: 24, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.primary },
  chartLegend: { flexDirection: 'row', gap: 12, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.bold },

  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.layout.borderRadius.md,
    padding: 4,
    ...theme.shadows.card,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: theme.colors.primary + '15' },
  tabBtnText: { fontSize: 14, fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textMuted },
  tabBtnTextActive: { color: theme.colors.primary },

  listContainer: { paddingHorizontal: theme.spacing.md },
  feeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 16, marginBottom: 12,
    ...theme.shadows.card,
  },
  feeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  feeTitle: { fontSize: 16, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  feeType: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, fontFamily: theme.typography.fontFamily.medium },
  feeAmount: { fontSize: 18, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  feeBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  dueDate: { fontSize: 13, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.bold },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontFamily: theme.typography.fontFamily.bold, letterSpacing: 0.5 },
  iconActionBtn: { padding: 6, backgroundColor: theme.colors.primary + '15', borderRadius: 8 },

  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 40, fontFamily: theme.typography.fontFamily.regular },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, minHeight: 400, ...theme.shadows.heavy,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  modalBody: { paddingBottom: 20 },
  modalFeeName: { fontSize: 22, fontFamily: theme.typography.fontFamily.heading, color: theme.colors.text },
  modalFeeType: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4, marginBottom: 24, fontFamily: theme.typography.fontFamily.medium },
  
  receiptBox: { backgroundColor: theme.colors.background, borderRadius: 16, padding: 16, marginBottom: 20 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptLabel: { fontSize: 14, color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.bold },
  receiptValue: { fontSize: 14, color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold },
  receiptTotalRow: { borderTopWidth: 1, borderTopColor: theme.colors.borderLight, paddingTop: 12, marginTop: 4, marginBottom: 0 },
  receiptTotalLabel: { fontSize: 16, color: theme.colors.text, fontFamily: theme.typography.fontFamily.heading },
  receiptTotalValue: { fontSize: 20, color: theme.colors.primary, fontFamily: theme.typography.fontFamily.heading },

  detailsBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.background, borderRadius: 16, padding: 16, marginBottom: 20 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 4, fontFamily: theme.typography.fontFamily.bold },
  detailValue: { fontSize: 14, color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold },

  infoBox: { flexDirection: 'row', backgroundColor: theme.colors.primary + '10', padding: 16, borderRadius: 12, alignItems: 'center', gap: 12 },
  infoText: { flex: 1, fontSize: 13, color: theme.colors.primary, fontFamily: theme.typography.fontFamily.medium, lineHeight: 18 },
});

export default FeesScreen;
