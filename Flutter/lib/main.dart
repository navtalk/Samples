import 'package:flutter/material.dart';
import 'package:navtalk_flutter_sample/pages/navtalk_page.dart';

void main(){
  runApp(MyCustomerApp());
}

class MyCustomerApp extends StatelessWidget{
  const MyCustomerApp({super.key});
  @override
  Widget build(BuildContext context){
    return MaterialApp(
      home: NavTalkPage(),
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.light,
    );
  }
}