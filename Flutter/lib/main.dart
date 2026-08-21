import 'package:flutter/material.dart';
import 'package:navtalk_flutter_sample/pages/home_page.dart';
void main(){
  runApp(MyCustomerApp());
}

class MyCustomerApp extends StatelessWidget{
  const MyCustomerApp({super.key});
  @override
  Widget build(BuildContext context){
    return MaterialApp(
      home: HomePage(),
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.light,
    );
  }
}