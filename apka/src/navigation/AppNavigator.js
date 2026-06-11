// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SpeciesListScreen from '../screens/GatunkiScreen';
import MeasureScreen from '../screens/MeasureScreen';
import CatchScreen from '../screens/CatchScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) return null;

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
                        <Stack.Screen name="SpeciesList" component={SpeciesListScreen} />
                        <Stack.Screen name="Measure" component={MeasureScreen} />
                        <Stack.Screen name="CatchScreen" component={CatchScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}