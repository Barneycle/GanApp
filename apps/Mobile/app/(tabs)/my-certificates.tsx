import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Image,
    ActivityIndicator,
    Platform,
    RefreshControl,
    TextInput,
    StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { CertificateService, Certificate } from '../../lib/certificateService';
import { useAuth } from '../../lib/authContext';
import { useToast } from '../../components/Toast';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { saveFileToGanApp } from '../../lib/mediaStoreSaver';

interface CertificateWithEvent extends Certificate {
    event?: {
        id: string;
        title: string;
        start_date: string;
        end_date?: string;
        status?: string;
        venue?: string;
        archived_at?: string;
    } | null;
}

export default function MyCertificates() {
    const [certificates, setCertificates] = useState<CertificateWithEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
    const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
    const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'png' | null>(null);
    const insets = useSafeAreaInsets();

    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const loadingRef = useRef(false);

    // Request media permissions (iOS only)
    const requestMediaPermissionsIfNeeded = async (): Promise<boolean> => {
        if (Platform.OS !== 'ios') return true;

        try {
            const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
            if (status === 'granted') return true;
            if (status === 'denied' && !canAskAgain) {
                toast.error('Media library permission is required. Please enable it in Settings.');
                return false;
            }
            const { status: newStatus } = await MediaLibrary.requestPermissionsAsync(false);
            return newStatus === 'granted';
        } catch (err) {
            console.error('Error requesting media permissions:', err);
            return false;
        }
    };

    const handleDownload = async (certificate: CertificateWithEvent, format: 'pdf' | 'png') => {
        if (!certificate) return;

        const url = format === 'pdf'
            ? certificate.certificate_pdf_url
            : certificate.certificate_png_url;

        if (!url) {
            toast.warning(`${format.toUpperCase()} certificate not available`);
            return;
        }

        try {
            setDownloadingCertId(certificate.id);
            setDownloadingFormat(format);

            // Request permissions if needed (iOS only)
            const hasPermission = await requestMediaPermissionsIfNeeded();
            if (!hasPermission) {
                throw new Error('Media library permission is required to save certificate');
            }

            const filename = `${certificate.certificate_number}.${format}`;
            console.log('📥 Downloading certificate:', filename, 'from URL:', url);

            // Download file
            const downloadResult = await FileSystem.downloadAsync(
                url,
                `${FileSystem.cacheDirectory}${filename}`
            );

            if (downloadResult.status !== 200) {
                throw new Error(`Failed to download file: HTTP ${downloadResult.status}`);
            }

            if (!downloadResult.uri) {
                throw new Error('Failed to download file from URL');
            }

            const fileUri = downloadResult.uri;
            console.log('✅ File downloaded to:', fileUri);

            // Ensure URI has file:// prefix
            const assetUri = fileUri.startsWith('file://')
                ? fileUri
                : `file://${fileUri}`;

            // Save using the same method as albums
            if (Platform.OS === 'android') {
                // Android: Use MediaStore API (no permissions needed on Android 10+)
                await saveFileToGanApp(assetUri, filename, format);
                toast.success('Certificate saved to your Downloads/GanApp folder!');
            } else {
                // iOS: Use MediaLibrary (permissions already checked above)
                const asset = await MediaLibrary.createAssetAsync(assetUri);
                const album = await MediaLibrary.getAlbumAsync('GanApp');
                if (album) {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                } else {
                    await MediaLibrary.createAlbumAsync('GanApp', asset, false);
                }
                toast.success('Certificate saved to your Photos/GanApp album!');
            }
        } catch (err: any) {
            console.error('Download error:', err);
            toast.error(err.message || `Failed to download ${format.toUpperCase()} certificate`);
        } finally {
            setDownloadingCertId(null);
            setDownloadingFormat(null);
        }
    };

    useEffect(() => {
        if (!user?.id) {
            router.replace('/login');
            return;
        }

        if (user?.role !== 'participant') {
            router.replace('/');
            return;
        }

        if (user?.id) {
            loadCertificates();
        }
    }, [user]);

    // Refresh when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id && user?.role === 'participant') {
                loadCertificates();
            }
        }, [user?.id, user?.role])
    );

    const loadCertificates = async () => {
        if (!user?.id || loadingRef.current) return;

        try {
            loadingRef.current = true;
            setLoading(true);
            setError(null);

            const result = await CertificateService.getUserCertificates(user.id);

            if (result.error) {
                console.error('Error loading certificates:', result.error);
                setError(result.error);
                setCertificates([]);
            } else {
                const certs = result.certificates || [];
                setCertificates(certs);

                // Expand first event by default
                if (certs.length > 0) {
                    const firstEventId = certs[0]?.event?.id;
                    if (firstEventId) {
                        setExpandedEvents(new Set([firstEventId]));
                    }
                }
            }
        } catch (err: any) {
            console.error('Error loading certificates:', err);
            setError(err.message || 'Failed to load certificates');
            setCertificates([]);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadCertificates().finally(() => setRefreshing(false));
    }, [user?.id]);

    // Group certificates by event
    const groupedCertificates = useMemo(() => {
        const grouped: Record<string, { event: any; certificates: CertificateWithEvent[] }> = {};

        certificates.forEach(cert => {
            if (!cert.event) return;

            const eventId = cert.event.id;
            if (!grouped[eventId]) {
                grouped[eventId] = {
                    event: cert.event,
                    certificates: []
                };
            }
            grouped[eventId].certificates.push(cert);
        });

        // Sort certificates within each group by generated_at (newest first)
        Object.values(grouped).forEach(group => {
            group.certificates.sort((a, b) =>
                new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
            );
        });

        return grouped;
    }, [certificates]);

    // Filter and search certificates
    const filteredGroupedCertificates = useMemo(() => {
        const filtered: Record<string, { event: any; certificates: CertificateWithEvent[] }> = {};
        const query = searchQuery.toLowerCase().trim();

        Object.entries(groupedCertificates).forEach(([eventId, group]) => {
            const matchingCerts = group.certificates.filter(cert => {
                const eventTitle = cert.event?.title?.toLowerCase() || '';
                const certNumber = cert.certificate_number?.toLowerCase() || '';
                const participantName = cert.participant_name?.toLowerCase() || '';

                return eventTitle.includes(query) ||
                    certNumber.includes(query) ||
                    participantName.includes(query);
            });

            if (matchingCerts.length > 0) {
                filtered[eventId] = {
                    ...group,
                    certificates: matchingCerts
                };
            }
        });

        return filtered;
    }, [groupedCertificates, searchQuery]);

    const toggleEventExpansion = (eventId: string) => {
        setExpandedEvents(prev => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView className="flex-1 bg-blue-900 items-center justify-center">
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="text-blue-100 text-lg mt-4">Loading certificates...</Text>
            </SafeAreaView>
        );
    }

    const eventGroups = Object.values(filteredGroupedCertificates);
    const totalCertificates = certificates.length;

    return (
        <SafeAreaView className="flex-1 bg-blue-900">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 20) + 80
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#2563eb"
                        colors={["#2563eb"]}
                    />
                }
            >

                <View className="w-full max-w-6xl mx-auto">
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by event name, certificate number, or participant name..."
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery('')}
                                style={styles.clearButton}
                            >
                                <Ionicons name="close-circle" size={20} color="#64748b" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Certificates Count */}
                    {totalCertificates > 0 && (
                        <View style={styles.countContainer}>
                            <Text style={styles.countText}>
                                Showing {totalCertificates} certificate{totalCertificates !== 1 ? 's' : ''} from {eventGroups.length} event{eventGroups.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}

                    {/* Certificates Display */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={24} color="#ef4444" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity
                                onPress={loadCertificates}
                                style={styles.retryButton}
                            >
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {totalCertificates === 0 && !error ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No Certificates Found</Text>
                            <Text style={styles.emptyText}>
                                {searchQuery
                                    ? 'No certificates match your search criteria.'
                                    : 'You don\'t have any certificates yet. Certificates will appear here after you complete events.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.certificatesList}>
                            {eventGroups.map((group) => {
                                const event = group.event;
                                const isExpanded = expandedEvents.has(event.id);
                                const certs = group.certificates;

                                return (
                                    <View key={event.id} style={styles.eventGroup}>
                                        {/* Event Header */}
                                        <TouchableOpacity
                                            onPress={() => toggleEventExpansion(event.id)}
                                            style={styles.eventHeader}
                                        >
                                            <View style={styles.eventHeaderContent}>
                                                <Text style={styles.eventTitle} numberOfLines={2}>
                                                    {event.title}
                                                </Text>
                                                <View style={styles.eventMeta}>
                                                    <View style={styles.eventMetaItem}>
                                                        <Ionicons name="calendar-outline" size={14} color="#64748b" />
                                                        <Text style={styles.eventMetaText}>
                                                            {formatDate(event.start_date)}
                                                            {event.end_date && event.end_date !== event.start_date && (
                                                                <> - {formatDate(event.end_date)}</>
                                                            )}
                                                        </Text>
                                                    </View>
                                                    {event.venue && (
                                                        <View style={styles.eventMetaItem}>
                                                            <Ionicons name="location-outline" size={14} color="#64748b" />
                                                            <Text style={styles.eventMetaText} numberOfLines={1}>
                                                                {event.venue}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <Text style={styles.certCount}>
                                                        {certs.length} certificate{certs.length !== 1 ? 's' : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Ionicons
                                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                size={24}
                                                color="#64748b"
                                            />
                                        </TouchableOpacity>

                                        {/* Certificates List */}
                                        {isExpanded && (
                                            <View style={styles.certificatesContainer}>
                                                {certs.map((cert) => (
                                                    <View key={cert.id} style={styles.certificateCard}>
                                                        {/* Certificate Preview */}
                                                        {cert.certificate_png_url ? (
                                                            <Image
                                                                source={{ uri: cert.certificate_png_url }}
                                                                style={styles.certificatePreview}
                                                                resizeMode="contain"
                                                            />
                                                        ) : (
                                                            <View style={[styles.certificatePreview, styles.certificatePlaceholder]}>
                                                                <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                                                            </View>
                                                        )}

                                                        {/* Certificate Info */}
                                                        <View style={styles.certificateInfo}>
                                                            <Text style={styles.certificateNumber}>
                                                                Certificate #{cert.certificate_number}
                                                            </Text>
                                                            <Text style={styles.certificateDetail}>
                                                                Issued: {formatDateTime(cert.generated_at)}
                                                            </Text>
                                                            <Text style={styles.certificateDetail}>
                                                                Completion: {formatDate(cert.completion_date)}
                                                            </Text>
                                                            {cert.participant_name && (
                                                                <Text style={styles.certificateDetail}>
                                                                    Participant: {cert.participant_name}
                                                                </Text>
                                                            )}

                                                            {/* Download Buttons */}
                                                            <View style={styles.downloadButtons}>
                                                                {cert.certificate_pdf_url && (
                                                                    <TouchableOpacity
                                                                        onPress={() => handleDownload(cert, 'pdf')}
                                                                        disabled={downloadingCertId === cert.id && downloadingFormat === 'pdf'}
                                                                        style={[
                                                                            styles.downloadButton,
                                                                            styles.pdfButton,
                                                                            (downloadingCertId === cert.id && downloadingFormat === 'pdf') && styles.downloadButtonDisabled
                                                                        ]}
                                                                    >
                                                                        {downloadingCertId === cert.id && downloadingFormat === 'pdf' ? (
                                                                            <ActivityIndicator size="small" color="#ffffff" />
                                                                        ) : (
                                                                            <Ionicons name="download-outline" size={18} color="#ffffff" />
                                                                        )}
                                                                        <Text style={styles.downloadButtonText}>PDF</Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                                {cert.certificate_png_url && (
                                                                    <TouchableOpacity
                                                                        onPress={() => handleDownload(cert, 'png')}
                                                                        disabled={downloadingCertId === cert.id && downloadingFormat === 'png'}
                                                                        style={[
                                                                            styles.downloadButton,
                                                                            styles.pngButton,
                                                                            (downloadingCertId === cert.id && downloadingFormat === 'png') && styles.downloadButtonDisabled
                                                                        ]}
                                                                    >
                                                                        {downloadingCertId === cert.id && downloadingFormat === 'png' ? (
                                                                            <ActivityIndicator size="small" color="#ffffff" />
                                                                        ) : (
                                                                            <Ionicons name="download-outline" size={18} color="#ffffff" />
                                                                        )}
                                                                        <Text style={styles.downloadButtonText}>PNG</Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1e293b',
    },
    clearButton: {
        marginLeft: 8,
        padding: 4,
    },
    countContainer: {
        marginBottom: 12,
    },
    countText: {
        fontSize: 14,
        color: '#e2e8f0',
    },
    errorContainer: {
        backgroundColor: '#ffffff',
        marginBottom: 16,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    errorText: {
        marginTop: 8,
        marginBottom: 16,
        fontSize: 14,
        color: '#ef4444',
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#1e40af',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    emptyContainer: {
        backgroundColor: '#ffffff',
        marginTop: 20,
        padding: 40,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1e293b',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
    },
    certificatesList: {
        paddingBottom: 20,
    },
    eventGroup: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    eventHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    eventHeaderContent: {
        flex: 1,
        marginRight: 12,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    eventMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
    },
    eventMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventMetaText: {
        fontSize: 12,
        color: '#64748b',
    },
    certCount: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    certificatesContainer: {
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        padding: 16,
    },
    certificateCard: {
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
    },
    certificatePreview: {
        width: '100%',
        height: 200,
        backgroundColor: '#f1f5f9',
    },
    certificatePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    certificateInfo: {
        padding: 16,
    },
    certificateNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 8,
    },
    certificateDetail: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
    },
    downloadButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    downloadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    pdfButton: {
        backgroundColor: '#1e40af',
    },
    pngButton: {
        backgroundColor: '#16a34a',
    },
    downloadButtonDisabled: {
        opacity: 0.6,
    },
    downloadButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
});

