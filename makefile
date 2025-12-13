dev:
	npm run dev

build:
	npm run build

preview:    
	npm run preview

lint:
	npx prettier . --write

build-ios: ./ios
	npx cap open ios

build-android: ./android
	npx cap open android
copy:
	npx cap copy
sync:
	npx cap sync