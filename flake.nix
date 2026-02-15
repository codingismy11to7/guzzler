{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };
  outputs =
    { nixpkgs, ... }:
    let
      forAllSystems =
        callback:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (
          system: callback nixpkgs.legacyPackages.${system}
        );
    in
    {
      formatter = forAllSystems (pkgs: pkgs.nixfmt);
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages =
            let
              mainPkgs = with pkgs; [
                nodejs_24
                python312
                uv
              ];
            in
            mainPkgs;
        };
      });
    };
}
