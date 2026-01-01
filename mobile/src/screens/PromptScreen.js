import { useState, useMemo } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'

const THEME_OPTIONS = [
  { label: 'System', value: 'auto' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' }
]

const COLOR_PRESETS = [
  { label: 'Indigo', value: '#2563eb' },
  { label: 'Coral', value: '#f97316' },
  { label: 'Emerald', value: '#22c55e' },
  { label: 'Magenta', value: '#d946ef' },
  { label: 'Sky', value: '#0ea5e9' }
]

const LAYOUT_OPTIONS = [
  { label: 'Hero + Features', description: 'Balanced hero, feature grid, CTA', value: 'hero+features' },
  { label: 'Single Column', description: 'Long-form storytelling stack', value: 'single-column' },
  { label: 'Spotlight', description: 'Deep dive layout with highlight sections', value: 'spotlight' }
]

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export default function PromptScreen() {
  const navigation = useNavigation()
  const [prompt, setPrompt] = useState('AI nutrition coach for busy founders, sends weekly meal plans, integrates with wearable data, celebrates progress.')
  const [theme, setTheme] = useState('auto')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [layout, setLayout] = useState('hero+features')
  const [loading, setLoading] = useState(false)

  const gradientStops = useMemo(
    () => [primaryColor, shadeColor(primaryColor, 30), shadeColor(primaryColor, -30)],
    [primaryColor]
  )

  async function handleGenerate() {
    if (!prompt || prompt.trim().length < 12) {
      Alert.alert('Prompt too short', 'Describe your landing page in at least one sentence.')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          options: { theme, primaryColor, layout }
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate.' }))
        throw new Error(error.error || 'We could not generate a site right now.')
      }

      const data = await response.json()
      navigation.navigate('Preview', {
        previewHtml: data.previewHtml,
        zipBase64: data.zipBase64,
        spec: data.spec,
        metrics: data.metrics,
        options: data.options
      })
    } catch (error) {
      Alert.alert('Generation failed', error.message || 'Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <LinearGradient
        colors={[gradientStops[0] + '22', 'transparent']}
        style={{ position: 'absolute', top: -120, left: -60, right: -60, height: 260, borderRadius: 160 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingTop: 32, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#e2e8f0', fontSize: 26, fontWeight: '700', letterSpacing: -0.4 }}>NeoSite</Text>
                <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 14 }}>
                  Describe your idea → download a hosted landing page bundle.
                </Text>
              </View>
              <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#1e293b' }}>
                <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600' }}>Edge ready</Text>
              </View>
            </View>
          </View>

          <View
            style={{
              backgroundColor: '#0f172a',
              borderRadius: 28,
              padding: 20,
              borderWidth: 1,
              borderColor: 'rgba(148, 163, 184, 0.12)',
              shadowColor: primaryColor,
              shadowOpacity: 0.12,
              shadowOffset: { width: 0, height: 16 },
              shadowRadius: 32
            }}
          >
            <Text style={{ color: '#e2e8f0', fontSize: 16, fontWeight: '600' }}>Describe your landing page</Text>
            <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>
              Share the product, audience, and vibe. We expand it into sections, copy and visuals.
            </Text>
            <TextInput
              multiline
              value={prompt}
              onChangeText={setPrompt}
              style={{
                marginTop: 16,
                borderRadius: 20,
                backgroundColor: '#020617',
                color: '#e2e8f0',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: 'rgba(148, 163, 184, 0.18)',
                minHeight: 140,
                textAlignVertical: 'top',
                fontSize: 15,
                lineHeight: 20
              }}
              placeholder="AI nutrition coach for busy founders..."
              placeholderTextColor="#64748b"
              maxLength={600}
            />

            <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'right', marginTop: 6 }}>{prompt.length} / 600</Text>

            <View style={{ marginTop: 20 }}>
              <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '600' }}>Theme</Text>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                {THEME_OPTIONS.map((option, index) => (
                  <OptionPill
                    key={option.value}
                    label={option.label}
                    active={theme === option.value}
                    onPress={() => setTheme(option.value)}
                    style={{ marginRight: index !== THEME_OPTIONS.length - 1 ? 10 : 0 }}
                  />
                ))}
              </View>
            </View>

            <View style={{ marginTop: 24 }}>
              <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '600' }}>Primary color</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
                {COLOR_PRESETS.map((preset, index) => (
                  <Pressable
                    key={preset.value}
                    onPress={() => setPrimaryColor(preset.value)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      borderWidth: primaryColor === preset.value ? 3 : 1,
                      borderColor: primaryColor === preset.value ? '#60a5fa' : 'rgba(148, 163, 184, 0.18)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#020617',
                      marginRight: (index + 1) % 4 === 0 ? 0 : 12,
                      marginBottom: 12
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        backgroundColor: preset.value,
                        borderWidth: 2,
                        borderColor: 'rgba(15, 23, 42, 0.6)'
                      }}
                    />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={primaryColor}
                onChangeText={setPrimaryColor}
                autoCapitalize="none"
                style={{
                  marginTop: 14,
                  borderRadius: 16,
                  backgroundColor: '#020617',
                  color: '#e2e8f0',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(148, 163, 184, 0.18)',
                  fontSize: 14,
                  fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
                }}
                placeholder="#2563eb"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={{ marginTop: 24 }}>
              <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Layout</Text>
              <View>
                {LAYOUT_OPTIONS.map((option, index) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setLayout(option.value)}
                    style={{
                      borderRadius: 20,
                      padding: 16,
                      backgroundColor: layout === option.value ? '#1e293b' : '#020617',
                      borderWidth: 1,
                      borderColor: layout === option.value ? '#60a5fa55' : 'rgba(148, 163, 184, 0.18)',
                      marginBottom: index === LAYOUT_OPTIONS.length - 1 ? 0 : 12
                    }}
                  >
                    <Text style={{ color: '#e2e8f0', fontSize: 15, fontWeight: '600' }}>{option.label}</Text>
                    <Text style={{ color: '#94a3b8', marginTop: 4, fontSize: 13 }}>{option.description}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleGenerate}
              disabled={loading}
              style={{
                marginTop: 28,
                borderRadius: 20,
                backgroundColor: loading ? '#1d4ed8' : '#2563eb',
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#2563eb',
                shadowOpacity: 0.32,
                shadowOffset: { width: 0, height: 16 },
                shadowRadius: 32
              }}
            >
              {loading ? (
                <ActivityIndicator color="#e2e8f0" />
              ) : (
                <Text style={{ color: '#e2e8f0', fontSize: 15, fontWeight: '600', letterSpacing: 0.6 }}>
                  Generate landing page
                </Text>
              )}
            </Pressable>

            <Text style={{ color: '#64748b', marginTop: 12, fontSize: 12 }}>
              Uses the same serverless API as the web app. Nothing is stored — download the ZIP or regenerate anytime.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function OptionPill({ label, active, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: active ? '#2563eb' : '#020617',
        borderWidth: 1,
        borderColor: active ? '#2563eb' : 'rgba(148, 163, 184, 0.2)',
        marginRight: 0,
        ...style
      }}
    >
      <Text style={{ color: active ? '#f8fafc' : '#94a3b8', fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}

function shadeColor(hex, percent) {
  const color = hex.replace('#', '')
  const num = parseInt(color, 16)
  const amt = Math.round(2.55 * percent)
  const r = clamp((num >> 16) + amt)
  const g = clamp(((num >> 8) & 0x00ff) + amt)
  const b = clamp((num & 0x0000ff) + amt)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function clamp(value) {
  return Math.max(0, Math.min(255, value))
}
