interface Resources {
  translation: {
    appName: "Guzzler";
    common: {
      back: "Back";
      cancel: "Cancel";
      close: "Close";
      loading: "Whipping the hamsters...";
      next: "Next";
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
  };
}

export default Resources;
