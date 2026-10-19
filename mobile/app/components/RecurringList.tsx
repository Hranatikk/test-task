import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatMinor } from '@core/common/money';
import { useTheme } from '@core/design-system/useTheme';
import { spacing } from '@core/design-system/sizing';
import { Card, StatusBadge, Text } from '@core/design-system/kit';
import { strings } from '@core/shared/i18n/strings';
import type { RecurringItem } from '@core/modules/statement-import';

export interface RecurringListProps {
  items: RecurringItem[];
  currency: string;
  onSelect: (item: RecurringItem) => void;
}

export function RecurringList({ items, currency, onSelect }: RecurringListProps) {
  const theme = useTheme();
  const total = items.reduce((sum, item) => sum + item.amountMinor, 0);

  return (
    <Card>
      <StatusBadge label={strings.ready} tone="success" />
      {items.map(item => (
        <Pressable
          key={item.id}
          onPress={() => onSelect(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.merchant}, ${formatMinor(item.amountMinor, currency)}, ${strings.viewDetails}`}
          style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.rowText}>
            <Text>{item.merchant}</Text>
            <Text color="muted">{item.cadence}</Text>
          </View>
          <Text variant="subtitle">{formatMinor(item.amountMinor, currency)}</Text>
        </Pressable>
      ))}
      <View style={[styles.totalRow, { borderColor: theme.border }]}>
        <Text variant="subtitle">{strings.totalPerMonth}</Text>
        <Text variant="subtitle">{formatMinor(total, currency)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  rowText: { flexShrink: 1 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
