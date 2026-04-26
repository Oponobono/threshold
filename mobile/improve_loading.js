const fs = require('fs');
const filePath = 'c:/Users/cris7/OneDrive/Desktop/Threshold/mobile/app/subjects/[subjectId].tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Merge useEffects and remove redundant state
// First, find the two useEffects and replace with one big one.
const newEffect = `  useEffect(() => {
    let mounted = true;

    const loadAllData = async () => {
      if (!subjectId) return;

      setIsLoading(true);
      try {
        const [profileRes, subjectRes, photosRes, assessmentsRes, schedulesRes] = await Promise.allSettled([
          getCurrentUserProfile(),
          getSubjectById(subjectId),
          getPhotosBySubject(subjectId),
          getAssessments(subjectId),
          getSchedulesBySubject(subjectId),
        ]);

        if (!mounted) return;

        if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
        if (subjectRes.status === 'fulfilled') setSelectedSubject(subjectRes.value as DetailSubject);
        if (photosRes.status === 'fulfilled') setPhotos(photosRes.value || []);
        if (assessmentsRes.status === 'fulfilled') setAssessments((assessmentsRes.value || []) as Assessment[]);
        if (schedulesRes.status === 'fulfilled') setSubjectSchedules(schedulesRes.value || []);
      } catch (err) {
        console.error('Error loading subject data:', err);
      } finally {
        if (mounted) {
          // Pequeño retardo artificial para asegurar que el renderizado de i18n y fuentes esté listo
          setTimeout(() => {
            if (mounted) setIsLoading(false);
          }, 400);
        }
      }
    };

    loadAllData();

    return () => {
      mounted = false;
    };
  }, [subjectId]);`;

// Replace the two effects. This is a bit complex with regex, so I'll be careful.
content = content.replace(/useEffect\(\(\) => \{[\s\S]*?loadSubjectData\(\);[\s\S]*?\}, \[subjectId\]\);/m, "");
content = content.replace(/useEffect\(\(\) => \{[\s\S]*?loadSubjectDetail\(\);[\s\S]*?\}, \[subjectId\]\);/m, newEffect);

// 2. Improve the loading screen JSX
const newLoadingJSX = `  if (isLoading) {
    return (
      <SafeAreaView style={[globalStyles.safeArea, { backgroundColor: '#fff' }]}>
        <View style={styles.premiumLoadingContainer}>
          <View style={styles.loadingLogoContainer}>
            <View style={styles.loadingLogoCircle}>
              <Ionicons name="leaf-outline" size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.loadingPulse} />
          </View>
          <Text style={styles.premiumLoadingText}>{t('subjects.loading').toUpperCase()}</Text>
          <View style={styles.loadingBarTrack}>
            <View style={styles.loadingBarFill} />
          </View>
        </View>
      </SafeAreaView>
    );
  }`;

content = content.replace(/if \(isLoading\) \{[\s\S]*?\n\s*\}/, newLoadingJSX);

// 3. Add styles for the premium loader
const newStyles = `  premiumLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  loadingLogoContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: \`\${theme.colors.primary}10\`,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  loadingPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: \`\${theme.colors.primary}30\`,
  },
  premiumLoadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.secondary,
    letterSpacing: 2,
    marginBottom: 16,
  },
  loadingBarTrack: {
    width: 140,
    height: 2,
    backgroundColor: '#F0F0F0',
    borderRadius: 1,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: '40%',
    height: '100%',
    backgroundColor: theme.colors.primary,
  },`;

// Append to styles
content = content.replace(/loadingText: \{[\s\S]*?\},/, (match) => match + "\n" + newStyles);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done');
