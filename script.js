document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrl = 'VITE_SUPABASE_URL';
    const supabaseKey = 'VITE_SUPABASE_ANON_KEY';
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    const formData = {
        personal: {},
        feedback: {},
        locations: []
    };

    let currentStage = 0;
    const stages = document.querySelectorAll('.stage');
    const form = document.getElementById('questionnaire-form');

    function showStage(stageNumber) {
        stages.forEach(stage => stage.classList.remove('active'));
        document.getElementById(`stage-${stageNumber}`).classList.add('active');
        currentStage = stageNumber;

        if (stageNumber === 3) {
            form.classList.add('wide-stage');
            setTimeout(() => map.invalidateSize(), 550);
        } else {
            form.classList.remove('wide-stage');
        }
    }

    document.querySelectorAll('.next-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (currentStage === 1) {
                const nameInput = document.getElementById('name');
                const ageInput = document.getElementById('age');
                const locationInput = document.getElementById('location');

                formData.personal.name = nameInput.value;
                formData.personal.age = ageInput.value;
                formData.personal.location = locationInput.value;

                let isValid = true;
                [nameInput, ageInput, locationInput].forEach(input => {
                    input.classList.remove('input-error');
                    if (!input.value) {
                        input.classList.add('input-error');
                        isValid = false;
                        input.addEventListener('input', () => input.classList.remove('input-error'), { once: true });
                    }
                });

                if (!isValid) {
                    return;
                }
            }
            if (currentStage === 2) {
                const transportRating = document.querySelector('input[name="transport"]:checked');
                formData.feedback.transportRating = transportRating ? transportRating.value : null;
                formData.feedback.likes = document.getElementById('feedback').value;
            }
            showStage(currentStage + 1);
        });
    });

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => {
            showStage(currentStage - 1);
        });
    });

    const bydgoszczCoords = [53.1235, 18.0084];
    const map = L.map('map').setView(bydgoszczCoords, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    const markers = [];

    const customIcon = L.divIcon({
        className: 'custom-marker-wrapper',
        html: '<div class="custom-marker-icon"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });

    map.on('click', (e) => {
        document.getElementById('map').classList.remove('input-error');
        const { lat, lng } = e.latlng;
        const point = { lat, lng };

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

        const container = document.createElement('div');
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-marker-btn';
        removeBtn.innerText = 'Remove Point';
        removeBtn.onclick = () => {
            map.removeLayer(marker);
            const index = markers.indexOf(marker);
            if (index > -1) {
                markers.splice(index, 1);
                formData.locations.splice(index, 1);
            }
        };
        container.appendChild(removeBtn);
        marker.bindPopup(container);

        formData.locations.push(point);
        markers.push(marker);
    });

    const successStage = document.getElementById('success-stage');
    const restartBtn = document.getElementById('restart-btn');

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

    restartBtn.addEventListener('click', () => {
        formData.personal = {};
        formData.feedback = {};
        formData.locations = [];
        form.reset();
        markers.forEach(marker => map.removeLayer(marker));
        markers.length = 0;
        successStage.classList.remove('active');
        showStage(0);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (formData.locations.length === 0) {
            const mapDiv = document.getElementById('map');
            mapDiv.classList.remove('input-error');
            void mapDiv.offsetWidth;
            mapDiv.classList.add('input-error');
            showNotification('Please select at least one point on the map.');
            return;
        }

        console.log('Submitting data:', formData);

        if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
            alert('supabase not configured');
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('survey_responses_test')
                .insert([
                    {
                        user_name: formData.personal.name,
                        user_age: parseInt(formData.personal.age),
                        user_location: formData.personal.location,
                        transport_rating: formData.feedback.transportRating,
                        feedback_text: formData.feedback.likes,
                        selected_points: formData.locations
                    }
                ]);

            if (error) throw error;

            stages.forEach(stage => stage.classList.remove('active'));
            successStage.classList.add('active');

        } catch (error) {
            console.error('Submission error:', error);
            alert(`Error: ${error.message || 'Check console for details'}`);
        }
    });

});
