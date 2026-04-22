import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { theme } from '../styles/theme';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export const FeatureCarousel = () => {
  const { t } = useTranslation();

  const features = [
    {
      id: '1',
      title: t('features.bento.title'),
      description: t('features.bento.desc'),
      icon: 'grid',
    },
    {
      id: '2',
      title: t('features.gpa.title'),
      description: t('features.gpa.desc'),
      icon: 'trending-up',
    },
    {
      id: '3',
      title: t('features.photo.title'),
      description: t('features.photo.desc'),
      icon: 'camera',
    },
  ];

  return (
    <View style={styles.carouselContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToInterval={width - theme.spacing.lg * 2}
        decelerationRate="fast"
      >
        <View style={[styles.pageContainer, { width: width - theme.spacing.lg * 2 }]}>
          {features.map((feature) => (
            <View key={feature.id} style={styles.featureCard}>
              <View style={styles.iconContainer}>
                <Feather name={feature.icon as any} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
            </View>
          ))}
          
          <View style={styles.paginationRow}>
            <View style={styles.dotsContainer}>
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
            <Text style={styles.swipeText}>{t('features.swipeToExplore')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  pageContainer: {
    // Width is set inline based on screen size
  },
  featureCard: {
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D9D9D9',
  },
  activeDot: {
    backgroundColor: theme.colors.primary,
  },
  swipeText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
  },
});
