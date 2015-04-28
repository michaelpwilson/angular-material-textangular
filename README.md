# angular-material-textangular
An Angular Material version of Text Angular

No need to include anything else, ```textAngular-rangy.min.js``` and ```textAngular-sanitize.min.js``` are already included.

## install
```
<!-- Angular Material Dependencies -->
<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular.min.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular-animate.min.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular-aria.min.js"></script>

<!-- Angular Material Javascript now available via Google CDN; version 0.8 used here -->
<script src="https://ajax.googleapis.com/ajax/libs/angular_material/0.8.3/angular-material.min.js"></script>
<script src="build/textAngular.min.js"></script>
```

```
app.controller('AppCtrl', ['$scope', function ($scope) {
  $scope.html = '';
}]);
```

```
<text-angular ng-model="html"></text-angular>
```
