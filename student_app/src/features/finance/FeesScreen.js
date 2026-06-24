import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { colors, shadows } from '../../theme/colors';
import { useGetFeesQuery } from '../../store/apiSlice';
import { useDrawer } from '../../navigation/DrawerContext';
import { useSelector, useDispatch } from 'react-redux';
import { generateReceiptPDF } from '../../utils/exportUtils';
import { BarChart } from 'react-native-gifted-charts';
import { setAcademicYear } from '../../store/settingsSlice';

const FeesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { openDrawer } = useDrawer();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'history'
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
  const { data, isLoading, refetch } = useGetFeesQuery(academicYear, { refetchOnMountOrArgChange: true });
  const availableYears = getAvailableYears();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const fees = data?.fees || [];
  const feeStructure = data?.feeStructure || [];
  const lateFeePenalty = data?.lateFeePenalty || 10;

  const currentDues = fees.filter(f => f.status === 'pending' || f.status === 'overdue');
  const historicalFees = fees.filter(f => f.status === 'paid');

  // Calculate totals specific to the selected academic year
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
           labelTextStyle: {color: colors.textMuted, fontSize: 10, fontWeight: '600'},
           frontColor: colors.secondary,
           topLabelComponent: () => {
             if (balance === 0) return null;
             return (
               <View style={{ width: 50, marginLeft: -19, alignItems: 'center', marginBottom: 2 }}>
                 <Text style={{ color: colors.success, fontSize: 10, fontWeight: 'bold' }} numberOfLines={1} adjustsFontSizeToFit>
                   ₹{formatCompactNumber(balance)}
                 </Text>
               </View>
             );
           }
         });
         chartData.push({
           value: d.paid,
           frontColor: colors.primary
         });
       }
    });
    return chartData;
  };
  const chartData = generateChartData(fees);

  const getStatusColor = (status) => {
    if (status === 'paid') return colors.success;
    if (status === 'overdue') return colors.danger;
    return colors.warning; // pending
  };

  const handlePressFee = (record) => {
    setSelectedFee(record);
    setModalVisible(true);
  };

  const renderFeeCard = (record) => {
    const feeInfo = record.fee;
    const statusColor = getStatusColor(record.status);
    const isPaid = record.status === 'paid';
    
    let totalAmount = Number(feeInfo?.amount || 0);
    if (record.status === 'overdue') {
      totalAmount += lateFeePenalty;
    }

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
               <Text style={{...styles.dueDate, marginTop: 2, color: colors.success}}>Paid: {new Date(record.payment_date).toLocaleDateString()}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isPaid && (
              <>
                <TouchableOpacity onPress={() => generateReceiptPDF(record, user)} style={styles.iconActionBtn}>
                  <Icon name="download" size={16} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => generateReceiptPDF(record, user)} style={styles.iconActionBtn}>
                  <Icon name="share-2" size={16} color={colors.primary} />
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
          <View style={[styles.statusChip, { backgroundColor: colors.primary + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.statusText, { color: colors.primary }]}>
              STANDARD FEE
            </Text>
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
              <Icon name="download" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => generateReceiptPDF(payment, user)} style={styles.iconActionBtn}>
              <Icon name="share-2" size={16} color={colors.primary} />
            </TouchableOpacity>
            <View style={[styles.statusChip, { backgroundColor: getStatusColor('paid') + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor('paid') }]} />
              <Text style={[styles.statusText, { color: getStatusColor('paid') }]}>
                SUCCESS
              </Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
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
                if (academicYear === year) {
                  refetch();
                } else {
                  dispatch(setAcademicYear(year));
                }
              }}
            >
              <Text style={[styles.yearChipText, academicYear === year && styles.yearChipTextActive]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Summary Chart Card */}
            <View style={styles.chartCard}>
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
                 <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: colors.secondary}]}/><Text style={styles.legendText}>Due</Text></View>
                 <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: colors.primary}]}/><Text style={styles.legendText}>Paid</Text></View>
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
                    yAxisTextStyle={{color: colors.textMuted, fontSize: 10, fontWeight: '600'}}
                    noOfSections={4}
                    hideRules
                    initialSpacing={10}
                    animationDuration={300}
                    isAnimated
                  />
                </View>
              ) : (
                <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{color: colors.textMuted}}>No data available for chart</Text>
                </View>
              )}
            </View>

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
                  <Icon name={activeTab === 'current' ? "check-circle" : "file-text"} size={48} color={colors.textMuted} />
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
                      <Icon name="x" size={24} color={colors.text} />
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
                        <Icon name="info" size={16} color={colors.primary} />
                        <Text style={styles.infoText}>Please clear the outstanding dues at the school fee counter.</Text>
                      </View>
                    )}
                    {isPaid && (
                      <TouchableOpacity 
                        style={styles.downloadBtn}
                        onPress={() => generateReceiptPDF(selectedFee, user)}
                      >
                        <Icon name="download" size={18} color="#fff" />
                        <Text style={styles.downloadBtnText}>Download Receipt</Text>
                      </TouchableOpacity>
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
  safeArea: { flex: 1, backgroundColor: colors.primary },
  scroll: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },

  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 },

  pageHeader: { paddingHorizontal: 24, paddingVertical: 20 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSubtitle: { fontSize: 16, color: colors.textMuted },
  
  yearScroll: { paddingBottom: 16 },
  yearScrollContent: { paddingHorizontal: 24, gap: 10 },
  yearChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  yearChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  yearChipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  yearChipTextActive: { color: '#fff' },

  chartCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 24, padding: 20,
    ...shadows.medium,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  chartSummaryBox: { flex: 1 },
  chartSummaryLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 4 },
  chartSummaryValueDue: { fontSize: 24, fontWeight: '800', color: colors.text },
  chartSummaryValuePaid: { fontSize: 24, fontWeight: '800', color: colors.primary },
  chartLegend: { flexDirection: 'row', gap: 12, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },

  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    ...shadows.card,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.primary + '15',
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.primary,
  },

  listContainer: { paddingHorizontal: 16 },
  feeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16, padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  feeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  feeTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  feeType: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  feeAmount: { fontSize: 18, fontWeight: '800', color: colors.text },
  feeBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  dueDate: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  iconActionBtn: {
    padding: 6,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
  },

  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
    ...shadows.heavy,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalBody: { paddingBottom: 20 },
  modalFeeName: { fontSize: 22, fontWeight: '700', color: colors.text },
  modalFeeType: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 24 },
  
  receiptBox: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  receiptValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  receiptTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  receiptTotalLabel: { fontSize: 16, color: colors.text, fontWeight: '800' },
  receiptTotalValue: { fontSize: 20, color: colors.primary, fontWeight: '900' },

  detailsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  detailValue: { fontSize: 14, color: colors.text, fontWeight: '600' },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, fontWeight: '500', lineHeight: 18 },
  downloadBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default FeesScreen;
