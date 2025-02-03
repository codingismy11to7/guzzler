interface Resources {
  translation: {
    addFillups: {
      nearbySearch: {
        badGateway: "Sorry, it appears we're having trouble talking to $t(locationProvider).";
        errorTitle: "Can't fetch stations";
        locationDisabled: "To fetch nearby places, you'll need to enable location permissions.";
        noMapsKey: {
          text01Preamble: "It costs [a very tiny amount of] money to search nearby [if you do it many, many times]. However, every API key receives a generous helping of free queries per month (hundreds per day). So to use this functionality, you must";
          text02CreateButton: "create an API key";
          text03AndThen: "and then";
          text04ProvideItButton: "securely provide it";
          text05Fin: "to $t(appName).";
        };
      };
    };
    appName: "Guzzler";
    categoryManagement: {
      events: "Events";
      fuels: "Fuels";
      title: "Categories";
      trips: "Trips";
    };
    common: {
      back: "Back";
      cancel: "Cancel";
      close: "Close";
      loading: "Whipping the hamsters...";
      next: "Next";
      notes: "Notes";
      save: "Save";
      thereWasAProblem: "There was a problem";
    };
    createUser: {
      change: "Change";
      checkingForConflictButton: "Checking...";
      confirm: "Confirm";
      conflictError: "Sorry, looks like somebody just took that username.";
      createAccount: "Looks Good";
      createAccountCountdown: "Looks Good ({{timeRemaining}})";
      createAccountQuestion: "Create account?";
      creatingAccount: "Creating account...";
      notAvailable: "Username isn't available";
      setUsername: "Username for new account";
    };
    errorDialog: {
      hideDetails: "😎 Done";
      seeDetails: "🤓 Details";
      title: "Something went wrong 😑";
    };
    importDialog: {
      aCar: {
        downloadUrl: "https://play.google.com/store/apps/details?id=com.zonewalker.acar";
        name: "aCar";
        timeZone: "Time Zone";
        timeZoneInfo: "The backup file has timestamps without any timezone information. Pick a zone to use to interpret them.";
      };
      appIconAltText: "{{title}} logo";
      export: "Export your data";
      noSelectedFile: "Selected File: 🤷";
      or: "Or";
      pickFile: "Pick File to Import";
      resetWarning: "This will erase all your settings and data. Be sure to make a backup before continuing, if you have any data to save.";
      selectedFile: "Selected File: {{fileName}}";
      startImport: "Start Import";
      title: "Import / Export";
      topText: "Import a backup file from:";
    };
    locationProvider: "Google Maps";
    login: {
      continue: "Continue with Google";
    };
    nameBackupDialog: {
      defaultBackupName: "$t(appName) Backup";
      export: "Export";
      nameLabel: "Give your backup a name:";
    };
    navDrawer: {
      userMenu: {
        logout: "Logout";
        settings: "Settings";
      };
    };
    redactedErrorPanel: {
      errorId: "Error id: {{id}}";
      message: "😞 Something went wrong on the server. We'll redouble the whipping of the hamsters.";
    };
    settings: {
      gmapsApiKey: "Google Maps API Key";
      gmapsApiKeyDescription: "Must be provided to perform location lookups.";
      setKey: {
        explanationButton: "API Key?";
        keyUrl: "https://developers.google.com/maps/documentation/javascript/get-api-key";
      };
      title: "Settings";
    };
    speedDial: {
      event: "Add Event";
      fillup: "Add Fillup";
      trip: "Add Trip";
    };
    successDialog: {
      text: "Your data was successfully imported. We imported 342 vehicles with a total fillup record count of 14e46 and event record count of 42.";
      title: "⛽ Success!";
    };
    trash: {
      hello: "Hello, {{name}}";
    };
    userMenu: {
      import: "Data Management";
      logout: "Logout";
    };
    vehicle: {
      title: "Vehicle";
    };
    vehicles: {
      title: "Vehicles";
    };
  };
}

export default Resources;
