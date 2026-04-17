(function () {
    const config = window.AppConfig.firebase;
    firebase.initializeApp(config);

    const db = firebase.database();
    const sessionsRef = db.ref('online_users');
    const myRef = sessionsRef.push();

    myRef.onDisconnect().remove();
    myRef.set({ t: firebase.database.ServerValue.TIMESTAMP });

    sessionsRef.on('value', function (snapshot) {
        const val = snapshot.val();
        const count = val ? Object.keys(val).length : 1;

        const widget = document.getElementById('online-widget');
        if (!widget) return;

        let state;
        if (count >= 3) state = 'party';
        else if (count === 2) state = 'together';
        else state = 'alone';

        widget.className = 'ow ow--' + state;
    });
})();
