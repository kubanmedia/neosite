import { useState, useCallback } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import WebView from 'react-native-webview'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

export default function PreviewScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { previewHtml, zipBase64, spec, metrics, options } = route.params || {}
  const [saving, setSaving] = useState(false)

  const handleSaveZip = useCallback(async () => {
    if (!zipBase64) return
    try {
      setSaving(true)
      const path = FileSystem.cacheDirectory + `neosite-${Date.now()}.zip`
      await FileSystem.writeAsStringAsync(path, zipBase64, { encoding: FileSystem.EncodingType.Base64 })

      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/zip',
          dialogTitle: 'Export NeoSite bundle'
        })
      } else {
        Alert.alert('Saved', `Bundle saved to ${path}`)
      }
    } catch (error) {
      console.error('share error', error)
      Alert.alert('Export failed', 'We could not save the ZIP file. Try again shortly.')
    } finally {
      setSaving(false)
    }
  }, [zipBase64])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(148, 163, 184, 0.18)'
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#0f172a' }}
        >
          <Text style={{ color: '#93c5fd', fontWeight: '600' }}>Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#e2e8f0', fontSize: 16, fontWeight: '700', letterSpacing: -0.4 }}>Preview bundle</Text>
        <TouchableOpacity
          onPress={handleSaveZip}
          disabled={saving}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: saving ? '#1d4ed8' : '#2563eb',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? (
            <ActivityIndicator color="#e2e8f0" />
          ) : (
            <Text style={{ color: '#f8fafc', fontWeight: '600' }}>Export ZIP</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ height: 520, margin: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', backgroundColor: '#0f172a' }}>
          {previewHtml ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: previewHtml }}
              style={{ flex: 1, backgroundColor: '#020617' }}
              setSupportMultipleWindows={false}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#60a5fa" />
            </View>
          )}
        </View>

        <View
          style={{
            marginHorizontal: 20,
            borderRadius: 24,
            backgroundColor: '#0f172a',
            borderWidth: 1,
            borderColor: 'rgba(148,163,184,0.18)',
            padding: 20
          }}
        >
          <Text style={{ color: '#e2e8f0', fontSize: 16, fontWeight: '600' }}>Summary</Text>
          <InfoRow label="Headline" value={spec?.headline} />
          <InfoRow label="Promise" value={spec?.promise} />
          <InfoRow label="Layout" value={options?.layout} />
          <View>
            <Text style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>Metrics</Text>
            <Text style={{ color: '#e2e8f0', marginTop: 6 }}>
              {metrics ? `${metrics.generationMs} ms · ${metrics.estimatedTokens} tokens` : '—'}
            </Text>
          </View>
        </View>

        <View style={{ marginHorizontal: 20, marginTop: 20 }}>
          {spec?.sections?.map((section, sectionIndex) => (
            <View
              key={section.id}
              style={{
                backgroundColor: '#0b1220',
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: 'rgba(148,163,184,0.1)',
                marginBottom: sectionIndex === (spec?.sections?.length || 0) - 1 ? 0 : 12
              }}
            >
              <Text style={{ color: '#60a5fa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.6 }}>{section.type}</Text>
              <Text style={{ color: '#e2e8f0', fontSize: 15, fontWeight: '600', marginTop: 6 }}>{section.title}</Text>
              {section.body ? <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 13 }}>{section.body}</Text> : null}
              {section.items ? (
                <View style={{ marginTop: 12 }}>
                  {section.items.map((item, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: '#020617',
                        borderRadius: 14,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(148,163,184,0.12)',
                        marginBottom: idx === section.items.length - 1 ? 0 : 8
                      }}
                    >
                      <Text style={{ color: '#cbd5f5', fontWeight: '600' }}>{item.title}</Text>
                      <Text style={{ color: '#94a3b8', marginTop: 4, fontSize: 12 }}>{item.description}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>{label}</Text>
      <Text style={{ color: '#e2e8f0', marginTop: 6, fontSize: 14 }}>{value}</Text>
    </View>
  )
}
