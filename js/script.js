document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'SUPABASE_URL';
    const supabaseKey = 'SUPABASE_ANON_KEY';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    const formData = {
        personal: {
            age: null,
            gender: null,
            education: null,
            district: null
        },
        cityFeedback: {
            problem: null,
            treesRating: 3,
            summerRating: 3,
            benefits: []
        },
        greenery: {
            greentime: null,
            transport: null,
            whatNew: null,
            parking: null,
            feedback: null
        },
        plantingLocations: []
    };

    let currentStage = 0;
    const stages = document.querySelectorAll('.stage');
    const form = document.getElementById('questionnaire-form');

    let mapPlantings = null;
    const markersPlantings = [];
    const bydgoszczCoords = [53.12397889906925, 18.058089720648695];

    const plantingMapId = 'map-plantings';

    function setupRatingDisplay(inputId, displayId) {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);
        if (input && display) {
            input.addEventListener('input', (e) => {
                display.textContent = `(${e.target.value})`;
            });
        }
    }
    setupRatingDisplay('trees-rating', 'trees-rating-val');
    setupRatingDisplay('summer-rating', 'summer-rating-val');


    function showStage(stageNumber) {
        stages.forEach(stage => stage.classList.remove('active'));
        const targetStage = document.getElementById(`stage-${stageNumber}`);
        if (targetStage) targetStage.classList.add('active');
        currentStage = stageNumber;

        window.scrollTo({ top: 0, behavior: 'smooth' });

        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        if (progressBar) {
            const progressMap = { 0: '0%', 1: '20%', 2: '40%', 3: '60%', 4: '80%', 5: '100%' };
            const percentage = progressMap[stageNumber] || '0%';
            progressBar.style.width = percentage;
            if (progressText) progressText.textContent = percentage;
        }

        if (stageNumber === 2) {
            form.classList.add('wide-stage');
            setTimeout(() => {
                initPlantingMap();
                if (mapPlantings) mapPlantings.invalidateSize();
            }, 100);
        } else {
            form.classList.remove('wide-stage');
        }
    }

    function setPolishValidity(input) {
        input.setCustomValidity("");
        if (!input.validity.valid) {
            if (input.validity.valueMissing) {
                input.setCustomValidity("Proszę wypełnić to pole.");
            } else if (input.validity.typeMismatch || input.validity.badInput) {
                if (input.type === 'number') {
                    input.setCustomValidity("Proszę wprowadzić poprawną liczbę.");
                } else {
                    input.setCustomValidity("Wprowadź poprawne dane.");
                }
            } else if (input.validity.rangeUnderflow) {
                input.setCustomValidity(`Wartość musi być większa lub równa ${input.min}.`);
            } else if (input.validity.rangeOverflow) {
                input.setCustomValidity(`Wartość musi być mniejsza lub równa ${input.max}.`);
            }
        }
    }

    const inputsToTranslate = document.querySelectorAll('input, select, textarea');
    inputsToTranslate.forEach(input => {
        input.addEventListener('invalid', () => setPolishValidity(input));
        input.addEventListener('input', () => input.setCustomValidity(""));
    });


    document.querySelectorAll('.next-btn').forEach(button => {
        if (button.id === 'restart-btn' || button.id === 'map-modal-okay') return;

        button.addEventListener('click', () => {
            if (validateCurrentStage()) {
                captureCurrentStageData();
                showStage(currentStage + 1);
            }
        });
    });

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => {
            showStage(currentStage - 1);
        });
    });

    const skipAdditionalBtn = document.getElementById('skip-additional-btn');
    if (skipAdditionalBtn) {
        skipAdditionalBtn.addEventListener('click', () => {
            formData.cityFeedback = { problem: null, treesRating: null, summerRating: null, benefits: [null] };
            formData.greenery = { greentime: null, transport: null, whatNew: null, parking: null, feedback: null };
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        });
    }


    function validateCurrentStage() {
        let isValid = true;
        let firstInvalid = null;
        let stageInputs = [];
        let groupContainers = [];

        const currentStageDiv = document.getElementById(`stage-${currentStage}`);
        if (!currentStageDiv) return true;


        currentStageDiv.querySelectorAll('.input-error').forEach(el => {
            el.classList.remove('input-error');
            if (el.classList.contains('radio-group')) {
                el.style.border = '';
                el.style.padding = '';
                el.style.borderRadius = '';
            }
        });

        if (currentStage === 0) {
            return true;
        } else if (currentStage === 1) {
            const age = document.getElementById('age');
            const gender = document.getElementById('gender');
            const education = document.getElementById('education');
            const district = document.getElementById('district');
            stageInputs = [age, gender, education, district];
        } else if (currentStage === 2) {
            if (formData.plantingLocations.length === 0) {
                const mapDiv = document.getElementById('map-plantings');
                mapDiv.classList.add('input-error');
                showNotification('Wybierz przynajmniej jeden punkt na mapie!');
                return false;
            }
            return true;
        } else if (currentStage === 3) {
            return true;
        } else if (currentStage === 4) {
            const problem = document.querySelector('input[name="problem"]:checked');
            const problemGroup = document.querySelector('input[name="problem"]').closest('.radio-group');

            const benefitsChecked = document.querySelectorAll('input[name="benefits"]:checked');
            const benefitsGroup = document.querySelector('input[name="benefits"]').closest('.radio-group');

            if (!problem) {
                isValid = false;
                markRadioGroupInvalid(problemGroup);
                if (!firstInvalid) firstInvalid = problemGroup;
            }
            if (benefitsChecked.length === 0) {
                isValid = false;
                markRadioGroupInvalid(benefitsGroup);
                if (!firstInvalid) firstInvalid = benefitsGroup;
            }
        } else if (currentStage === 5) {
            const greentime = document.getElementById('greentime');
            const transport = document.getElementById('transport');
            const feedback = document.getElementById('feedback');
            stageInputs = [greentime, transport];

            const whatNew = document.querySelector('input[name="what-new"]:checked');
            const whatNewGroup = document.querySelector('input[name="what-new"]').closest('.radio-group');

            const parking = document.querySelector('input[name="parking"]:checked');
            const parkingGroup = document.querySelector('input[name="parking"]').closest('.radio-group');

            if (!whatNew) {
                isValid = false;
                markRadioGroupInvalid(whatNewGroup);
                if (!firstInvalid) firstInvalid = whatNewGroup;
            }
            if (!parking) {
                isValid = false;
                markRadioGroupInvalid(parkingGroup);
                if (!firstInvalid) firstInvalid = parkingGroup;
            }
        }

        stageInputs.forEach(input => {
            if (!input.checkValidity()) {
                input.classList.add('input-error');
                isValid = false;
                if (!firstInvalid) firstInvalid = input;
                input.addEventListener('input', () => input.classList.remove('input-error'), { once: true });
            }
        });

        if (!isValid) {
            if (firstInvalid && firstInvalid.scrollIntoView) {
                if (firstInvalid.reportValidity) firstInvalid.reportValidity();
                else showNotification("Uzupełnij brakujące pola.");
            } else {
                showNotification("Uzupełnij brakujące pola.");
            }
            return false;
        }

        return true;
    }

    function markRadioGroupInvalid(group) {
        group.classList.add('input-error');
        group.style.border = '1px solid #dc3545';
        group.style.padding = '5px';
        group.style.borderRadius = '4px';
        const inputs = group.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                group.classList.remove('input-error');
                group.style.border = '';
                group.style.padding = '';
                group.style.borderRadius = '';
            }, { once: true });
        });
    }

    function captureCurrentStageData() {
        if (currentStage === 1) {
            formData.personal.age = document.getElementById('age').value;
            formData.personal.gender = document.getElementById('gender').value;
            formData.personal.education = document.getElementById('education').value;
            formData.personal.district = document.getElementById('district').value;
        } else if (currentStage === 4) {
            formData.cityFeedback.problem = document.querySelector('input[name="problem"]:checked')?.value;
            formData.cityFeedback.treesRating = document.getElementById('trees-rating').value;
            formData.cityFeedback.summerRating = document.getElementById('summer-rating').value;
            const benefitsChecked = document.querySelectorAll('input[name="benefits"]:checked');
            formData.cityFeedback.benefits = Array.from(benefitsChecked).map(cb => cb.value);
        } else if (currentStage === 5) {
            formData.greenery.greentime = document.getElementById('greentime').value;
            formData.greenery.transport = document.getElementById('transport').value;
            formData.greenery.whatNew = document.querySelector('input[name="what-new"]:checked')?.value;
            formData.greenery.parking = document.querySelector('input[name="parking"]:checked')?.value;
            formData.greenery.feedback = document.getElementById('feedback').value;
        }
    }



    const customIcon = L.divIcon({
        className: 'custom-marker-wrapper',
        html: '<div class="custom-marker-icon"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    function initPlantingMap() {
        if (mapPlantings) return;

        const defaultLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 20
        });

        mapPlantings = L.map('map-plantings', {
            center: bydgoszczCoords,
            zoom: 13,
            layers: [defaultLayer]
        });

        const baseMaps = {
            "Mapa": defaultLayer,
            "Satelita": satelliteLayer
        };

        L.control.layers(baseMaps).addTo(mapPlantings);

        mapPlantings.on('click', (e) => {
            document.getElementById('map-plantings').classList.remove('input-error');
            const { lat, lng } = e.latlng;
            const point = { lat, lng };

            const marker = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(mapPlantings);

            const container = document.createElement('div');
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-marker-btn';
            removeBtn.innerText = 'Usuń punkt';
            removeBtn.onclick = () => {
                mapPlantings.removeLayer(marker);
                const index = markersPlantings.indexOf(marker);
                if (index > -1) {
                    markersPlantings.splice(index, 1);
                    formData.plantingLocations.splice(index, 1);
                }
            };
            container.appendChild(removeBtn);
            marker.bindPopup(container);

            marker.on('dragend', function (event) {
                const position = marker.getLatLng();
                const index = markersPlantings.indexOf(marker);
                if (index > -1) {
                    formData.plantingLocations[index] = { lat: position.lat, lng: position.lng };
                }
            });

            markersPlantings.push(marker);
            formData.plantingLocations.push(point);
        });
    }

    const clearPlantingsBtn = document.getElementById('clear-map-btn-plantings');
    if (clearPlantingsBtn) {
        clearPlantingsBtn.addEventListener('click', () => {
            markersPlantings.forEach(m => mapPlantings.removeLayer(m));
            markersPlantings.length = 0;
            formData.plantingLocations = [];
        });
    }


    const notificationToast = document.getElementById('notification-toast');
    const notificationMessage = document.getElementById('notification-message');
    const notificationClose = document.getElementById('notification-close');
    let notificationTimeout;

    function showNotification(message, duration = 4000) {
        notificationMessage.textContent = message;
        notificationToast.classList.add('active');
        if (notificationTimeout) clearTimeout(notificationTimeout);
        notificationTimeout = setTimeout(() => {
            notificationToast.classList.remove('active');
        }, duration);
    }

    notificationClose.addEventListener('click', () => {
        notificationToast.classList.remove('active');
        if (notificationTimeout) clearTimeout(notificationTimeout);
    });



    const successStage = document.getElementById('success-stage');
    const restartBtn = document.getElementById('restart-btn');

    restartBtn.addEventListener('click', () => {
        form.reset();

        formData.personal = { age: null, gender: null, education: null, district: null };
        formData.cityFeedback = { problem: null, treesRating: 3, summerRating: 3, benefits: [] };
        formData.greenery = { greentime: null, transport: null, whatNew: null, parking: null, feedback: null };
        formData.plantingLocations = [];

        markersPlantings.forEach(m => mapPlantings.removeLayer(m));
        markersPlantings.length = 0;

        currentStage = 0;
        successStage.classList.remove('active');
        showStage(0);
        window.scrollTo(0, 0);

        document.getElementById('trees-rating-val').textContent = '(3)';
        document.getElementById('summer-rating-val').textContent = '(3)';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        console.log('Submitting data:', formData);

        if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
            alert('supabase not configured');
            return;
        }

        try {

            const payload = {
                user_age: parseInt(formData.personal.age),
                user_gender: formData.personal.gender,
                education_level: formData.personal.education,
                district: formData.personal.district,

                problem_type: formData.cityFeedback.problem,
                trees_rating: formData.cityFeedback.treesRating === null ? null : parseInt(formData.cityFeedback.treesRating),
                summer_rating: formData.cityFeedback.summerRating === null ? null : parseInt(formData.cityFeedback.summerRating),
                benefits_type: formData.cityFeedback.benefits,

                greenery_time: formData.greenery.greentime,
                transport_mode: formData.greenery.transport,
                desired_greenery: formData.greenery.whatNew,
                parking_opinion: formData.greenery.parking,
                heat_island_feedback: formData.greenery.feedback,

                planting_locations: formData.plantingLocations,
                residence_location: null
            };

            const { data, error } = await supabaseClient
                .from('test2')
                .insert([payload]);

            if (error) throw error;

            stages.forEach(stage => stage.classList.remove('active'));
            successStage.classList.add('active');
            const progressBar = document.getElementById('progress-bar');
            if (progressBar) progressBar.style.width = '100%';

        } catch (error) {
            console.error('Submission error:', error);
            showNotification(`Błąd wysyłania: ${error.message || 'Spróbuj ponownie później.'}`);
        }
    });

    // Map Instruction Modal Logic
    const mapModalOverlay = document.getElementById('map-instruction-modal');
    const mapInfoBtn = document.getElementById('map-info-btn');
    const mapModalCloseX = document.getElementById('map-modal-close-x');
    const mapModalOkay = document.getElementById('map-modal-okay');

    function closeMapModal() {
        if (mapModalOverlay) mapModalOverlay.classList.add('hidden');
    }

    function openMapModal() {
        if (mapModalOverlay) mapModalOverlay.classList.remove('hidden');
    }

    if (mapModalCloseX) mapModalCloseX.addEventListener('click', closeMapModal);
    if (mapModalOkay) mapModalOkay.addEventListener('click', closeMapModal);
    if (mapInfoBtn) mapInfoBtn.addEventListener('click', openMapModal);
});
