import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useColorScheme } from 'react-native'
import PromptScreen from './src/screens/PromptScreen'
import PreviewScreen from './src/screens/PreviewScreen'

const Stack = createNativeStackNavigator()

const lightPalette = {
  primary: '#2563eb',
  background: '#f1f5f9',
  card: '#0f172a',
  text: '#0f172a',
  border: '#e2e8f0'
}

const darkPalette = {
  primary: '#60a5fa',
  background: '#020617',
  card: '#020617',
  text: '#e2e8f0',
  border: '#1e293b'
}

export default function App() {
  const scheme = useColorScheme()

  const theme = scheme === 'dark'
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          ...darkPalette
        }
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          ...lightPalette
        }
      }

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom'
        }}
      >
        <Stack.Screen name="Prompt" component={PromptScreen} />
        <Stack.Screen name="Preview" component={PreviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
