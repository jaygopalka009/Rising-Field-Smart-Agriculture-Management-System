package com.risingfield.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Code-based translation service (NO external API).
 * All translations are stored in this file itself as a dictionary.
 * Supported languages: English (en), Hindi (hi), Gujarati (gu)
 */
@Service
public class TranslationService {

    // key -> { "en" -> ..., "hi" -> ..., "gu" -> ... }
    private static final Map<String, Map<String, String>> DICTIONARY = new HashMap<>();

    private static void add(String en, String hi, String gu) {
        Map<String, String> entry = new HashMap<>();
        entry.put("en", en);
        entry.put("hi", hi);
        entry.put("gu", gu);
        DICTIONARY.put(en.toLowerCase(), entry);
    }

    static {
        // ---------- Common / App ----------
        add("Welcome", "स्वागत है", "સ્વાગત છે");
        add("Home", "होम", "હોમ");
        add("Login", "लॉगिन", "લૉગિન");
        add("Register", "पंजीकरण", "નોંધણી");
        add("Logout", "लॉगआउट", "લૉગઆઉટ");
        add("Profile", "प्रोफ़ाइल", "પ્રોફાઇલ");
        add("Settings", "सेटिंग्स", "સેટિંગ્સ");
        add("Search", "खोजें", "શોધો");
        add("Submit", "जमा करें", "સબમિટ કરો");
        add("Cancel", "रद्द करें", "રદ કરો");
        add("Save", "सहेजें", "સાચવો");
        add("Delete", "हटाएं", "કાઢી નાખો");
        add("Edit", "संपादित करें", "સંપાદિત કરો");
        add("Yes", "हाँ", "હા");
        add("No", "नहीं", "ના");
        add("Name", "नाम", "નામ");
        add("Email", "ईमेल", "ઈમેલ");
        add("Password", "पासवर्ड", "પાસવર્ડ");
        add("Phone", "फ़ोन", "ફોન");
        add("Address", "पता", "સરનામું");
        add("Date", "तारीख", "તારીખ");
        add("Time", "समय", "સમય");
        add("Price", "कीमत", "કિંમત");
        add("Total", "कुल", "કુલ");
        add("Notification", "सूचना", "સૂચના");
        add("Notifications", "सूचनाएं", "સૂચનાઓ");

        // ---------- Farmer / Agriculture ----------
        add("Farmer", "किसान", "ખેડૂત");
        add("Farm", "खेत", "ખેતર");
        add("Farming", "खेती", "ખેતી");
        add("Crop", "फसल", "પાક");
        add("Crops", "फसलें", "પાકો");
        add("Harvest", "कटाई", "લણણી");
        add("Seed", "बीज", "બીજ");
        add("Fertilizer", "उर्वरक", "ખાતર");
        add("Irrigation", "सिंचाई", "સિંચાઈ");
        add("Soil", "मिट्टी", "માટી");
        add("Land", "जमीन", "જમીન");

        // ---------- Labour / Equipment ----------
        add("Labour", "मजदूर", "મજૂર");
        add("Labourer", "मजदूर", "મજૂર");
        add("Worker", "श्रमिक", "કામદાર");
        add("Workers", "श्रमिक", "કામદારો");
        add("Equipment", "उपकरण", "સાધનો");
        add("Tractor", "ट्रैक्टर", "ટ્રેક્ટર");
        add("Harvester", "हार्वेस्टर", "હાર્વેસ્ટર");
        add("Plough", "हल", "હળ");
        add("Machine", "मशीन", "મશીન");
        add("Available", "उपलब्ध", "ઉપલબ્ધ");
        add("Not Available", "उपलब्ध नहीं", "ઉપલબ્ધ નથી");
        add("Category", "श्रेणी", "શ્રેણી");
        add("Categories", "श्रेणियां", "શ્રેણીઓ");

        // ---------- Booking ----------
        add("Book", "बुक करें", "બુક કરો");
        add("Booking", "बुकिंग", "બુકિંગ");
        add("Bookings", "बुकिंग", "બુકિંગ");
        add("Book Now", "अभी बुक करें", "હમણાં બુક કરો");
        add("Book Equipment", "उपकरण बुक करें", "સાધન બુક કરો");
        add("Book Labour", "मजदूर बुक करें", "મજૂર બુક કરો");
        add("My Bookings", "मेरी बुकिंग", "મારી બુકિંગ");
        add("Booking Confirmed", "बुकिंग की पुष्टि हो गई", "બુકિંગ કન્ફર્મ થયું");
        add("Booking Cancelled", "बुकिंग रद्द कर दी गई", "બુકિંગ રદ થયું");
        add("Pending", "लंबित", "બાકી");
        add("Confirmed", "पुष्टि की गई", "કન્ફર્મ");
        add("Cancelled", "रद्द", "રદ");
        add("Completed", "पूर्ण", "પૂર્ણ");
        add("Approved", "स्वीकृत", "મંજૂર");
        add("Rejected", "अस्वीकृत", "નામંજૂર");
        add("Status", "स्थिति", "સ્થિતિ");

        // ---------- Payment ----------
        add("Payment", "भुगतान", "ચુકવણી");
        add("Payments", "भुगतान", "ચુકવણીઓ");
        add("Pay Now", "अभी भुगतान करें", "હમણાં ચૂકવો");
        add("Payment Successful", "भुगतान सफल", "ચુકવણી સફળ");
        add("Payment Failed", "भुगतान विफल", "ચુકવણી નિષ્ફળ");
        add("Amount", "राशि", "રકમ");
        add("Cash", "नकद", "રોકડ");
        add("Online", "ऑनलाइन", "ઓનલાઈન");

        // ---------- Messages ----------
        add("Success", "सफलता", "સફળતા");
        add("Error", "त्रुटि", "ભૂલ");
        add("Something went wrong", "कुछ गलत हो गया", "કંઈક ખોટું થયું");
        add("Please try again", "कृपया पुनः प्रयास करें", "કૃપા કરીને ફરી પ્રયાસ કરો");
        add("Thank you", "धन्यवाद", "આભાર");
    }

    // Reverse lookup: hindi/gujarati word -> dictionary key
    private static final Map<String, String> REVERSE_INDEX = new HashMap<>();

    static {
        for (Map.Entry<String, Map<String, String>> e : DICTIONARY.entrySet()) {
            REVERSE_INDEX.put(e.getValue().get("hi"), e.getKey());
            REVERSE_INDEX.put(e.getValue().get("gu"), e.getKey());
        }
    }

    /**
     * Translate text from source language to target language.
     * Works fully offline using the in-code dictionary above.
     * If a word is not in the dictionary, it is returned as-is.
     *
     * @param text       Text to translate
     * @param sourceLang Source language code (en, hi, gu)
     * @param targetLang Target language code (en, hi, gu)
     * @return Translated text
     */
    public String translate(String text, String sourceLang, String targetLang) {
        if (text == null || text.isBlank() || sourceLang.equals(targetLang)) {
            return text;
        }

        String trimmed = text.trim();

        // 1. Try full phrase match first (e.g. "Book Now", "Payment Successful")
        String key = findKey(trimmed, sourceLang);
        if (key != null) {
            return DICTIONARY.get(key).get(targetLang);
        }

        // 2. Otherwise translate word by word
        String[] words = trimmed.split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            String wordKey = findKey(word, sourceLang);
            if (result.length() > 0) {
                result.append(" ");
            }
            result.append(wordKey != null ? DICTIONARY.get(wordKey).get(targetLang) : word);
        }
        return result.toString();
    }

    /** Find dictionary key for given text in given language */
    private String findKey(String text, String sourceLang) {
        if (sourceLang.equals("en")) {
            String key = text.toLowerCase();
            return DICTIONARY.containsKey(key) ? key : null;
        }
        // hindi / gujarati -> use reverse index
        return REVERSE_INDEX.get(text);
    }

    /**
     * Translate to English
     */
    public String toEnglish(String text, String sourceLang) {
        return translate(text, sourceLang, "en");
    }

    /**
     * Translate to Hindi
     */
    public String toHindi(String text, String sourceLang) {
        return translate(text, sourceLang, "hi");
    }

    /**
     * Translate to Gujarati
     */
    public String toGujarati(String text, String sourceLang) {
        return translate(text, sourceLang, "gu");
    }
}
